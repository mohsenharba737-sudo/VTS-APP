const { useState, useEffect } = React;

const API_BASE = "http://127.0.0.1:5000/api";

function App() {

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  const [observations, setObservations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [vtsUsers, setVtsUsers] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [filterField, setFilterField] = useState("all");

  const [loginForm, setLoginForm] = useState({ username: "port", password: "control" });
  const [loginError, setLoginError] = useState("");

  const [userForm, setUserForm] = useState({ name: "", username: "", password: "" });
  const [excelFile, setExcelFile] = useState(null);

  // state جديد لإضافة مشاهدة
  const [observationForm, setObservationForm] = useState({
    date: "",
    time: "",
    employee: "",
    ship: "",
    observation: "",
    notes: ""
  });

  // state فلتر سجل الحركات
  const [logSearchText, setLogSearchText] = useState("");
  const [logFilterField, setLogFilterField] = useState("all");

  const fetchJson = async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        console.error("Server returned non-OK:", text);
        return { success: false, error: text };
      }
      const data = await res.json();
      return { success: true, data };
    } catch (err) {
      console.error("Fetch error:", err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    if (user) {
      fetchJson(`${API_BASE}/observations`).then(res => res.success && setObservations(res.data));
      fetchJson(`${API_BASE}/logs`).then(res => res.success && setLogs(res.data));
      fetchJson(`${API_BASE}/users`).then(res => res.success && setVtsUsers(res.data));
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    const res = await fetchJson(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm)
    });

    if (!res.success) {
      setLoginError("فشل الاتصال بالخادم");
      return;
    }

    if (!res.data.success) {
      setLoginError("فشل تسجيل الدخول");
      return;
    }

    setUser(res.data.user);
  };

  const handleImportExcel = async () => {
    if (!excelFile) return alert("اختر ملف Excel");

    const formData = new FormData();
    formData.append("file", excelFile);

    const res = await fetchJson(`${API_BASE}/import-excel`, { method: "POST", body: formData });

    if (!res.success || !res.data.success) {
      alert("فشل الاستيراد");
      return;
    }

    fetchJson(`${API_BASE}/observations`).then(res => res.success && setObservations(res.data));
    alert("تم الاستيراد");
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    const res = await fetchJson(`${API_BASE}/add-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm)
    });

    if (!res.success || !res.data.success) {
      alert("فشل إضافة المستخدم");
      return;
    }

    setVtsUsers(prev => [...prev, res.data.user]);
    setUserForm({ name: "", username: "", password: "" });
  };

  const handleDeleteUser = async (id) => {
    if(!window.confirm("هل تريد حذف هذا الموظف؟")) return;

    const res = await fetchJson(`${API_BASE}/users/${id}`, { method: "DELETE" });

    if (!res.success || !res.data.success) {
      alert("فشل حذف المستخدم");
      return;
    }

    setVtsUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleAddObservation = async (e) => {
    e.preventDefault();

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];

    const payload = {
      ...observationForm,
      date: observationForm.date || date,
      time: observationForm.time || time
    };

    const res = await fetchJson(`${API_BASE}/add-observation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.success || !res.data.success) {
      alert("فشل إضافة المشاهدة");
      return;
    }

    fetchJson(`${API_BASE}/observations`).then(res => res.success && setObservations(res.data));
    setObservationForm({ date: "", time: "", employee: "", ship: "", observation: "", notes: "" });
  };

  const filteredObservations = observations.filter(obs => {
    if(!searchText) return true;
    const t = searchText.trim().toLowerCase();

    if(filterField === "all") {
      return Object.values(obs).some(v => (v||"").toString().toLowerCase().includes(t));
    } else if(filterField === "date") {
      return obs.date.toLowerCase().includes(t);
    } else {
      return (obs[filterField]||"").toLowerCase().includes(t);
    }
  });

  // فلتر سجل الحركات
  const filteredLogs = logs.filter(l => {
    if(!logSearchText) return true;
    const t = logSearchText.trim().toLowerCase();

    if(logFilterField === "all") {
      return [l.username, l.action, l.details].some(v => (v||"").toLowerCase().includes(t));
    } else if(logFilterField === "username") {
      return (l.username||"").toLowerCase().includes(t);
    } else if(logFilterField === "action") {
      return (l.action||"").toLowerCase().includes(t);
    } else if(logFilterField === "details") {
      return (l.details||"").toLowerCase().includes(t);
    }
    return false;
  });

  const renderLogin = () => (
    <div className="login-wrapper">
      <div className="login-card glass">
        <h2>🔐 تسجيل الدخول</h2>
        <form onSubmit={handleLogin}>
          <input className="form-input" placeholder="اسم المستخدم"
            value={loginForm.username}
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input className="form-input" type="password" placeholder="كلمة السر"
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          <button className="btn btn-primary full-width">دخول</button>
          {loginError && <div className="error-text">{loginError}</div>}
        </form>
      </div>
    </div>
  );

  const renderIcons = () => {
    const icons = [
      {key:"observations", emoji:"📋", title:"سجل المشاهدات"},
      {key:"vts", emoji:"🧭", title:"موظفو VTS"},
      {key:"logs", emoji:"📜", title:"سجل الحركات"}
    ];
    return (
      <div className="icon-grid">
        {icons.map(i => (
          <div key={i.key} className="icon-card glass" onClick={()=>setActiveTab(i.key)}>
            <div className="icon-emoji">{i.emoji}</div>
            <div className="icon-title">{i.title}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderDashboard = () => (
    <div>
      {activeTab === "vts" && (
        <div className="card glass">
          <h3>🧭 موظفو VTS</h3>
          <form className="inline-form" onSubmit={handleAddUser}>
            <input className="form-input" placeholder="الاسم"
              value={userForm.name} onChange={e => setUserForm({...userForm,name:e.target.value})}
            />
            <input className="form-input" placeholder="اسم المستخدم"
              value={userForm.username} onChange={e => setUserForm({...userForm,username:e.target.value})}
            />
            <input className="form-input" placeholder="كلمة السر"
              value={userForm.password} onChange={e => setUserForm({...userForm,password:e.target.value})}
            />
            <button className="btn btn-primary">➕ إضافة</button>
          </form>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>اسم المستخدم</th>
                  <th>كلمة السر</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {vtsUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td>{u.password}</td>
                    <td>
                      <button className="btn btn-danger" onClick={()=>handleDeleteUser(u.id)}>❌ حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="card glass">
          <h3>📜 سجل الحركات</h3>

          {/* فلتر سجل الحركات */}
          <div className="filters-row">
            <select value={logFilterField} onChange={e=>setLogFilterField(e.target.value)}>
              <option value="all">كل الحقول</option>
              <option value="username">الموظف</option>
              <option value="action">الحركة</option>
              <option value="details">التفاصيل</option>
            </select>
            <input
              type="text"
              className="filter-input"
              placeholder="بحث..."
              value={logSearchText}
              onChange={e=>setLogSearchText(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>المستخدم</th>
                  <th>الحركة</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l,i) => (
                  <tr key={i}>
                    <td>{l.time}</td>
                    <td>{l.username}</td>
                    <td>{l.action}</td>
                    <td>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="app-shell">
        <header className="app-header glass">
          <div className="logo-header">
            <img src="/static/logo.png" alt="Logo" className="app-logo" />
            <h1 className="logo-text">ميناء اللاذقية</h1>
          </div>

          <div>
            {activeTab && <button className="btn btn-secondary" onClick={()=>setActiveTab(null)}>⬅ رجوع</button>}
            <button className="btn btn-secondary" onClick={()=>setUser(null)}>🚪 خروج</button>
          </div>
        </header>

        <main className="app-main">
          {!activeTab && renderIcons()}

          {activeTab==="observations" && (
            <div className="card glass">
              <h3>📋 سجل المشاهدات</h3>

              {/* نموذج إضافة مشاهدة جديد */}
              <form className="inline-form" onSubmit={handleAddObservation}>
                <input type="date"
                  className="form-input"
                  value={observationForm.date}
                  onChange={e => setObservationForm({...observationForm, date:e.target.value})}
                />
                <input type="time"
                  className="form-input"
                  value={observationForm.time}
                  onChange={e => setObservationForm({...observationForm, time:e.target.value})}
                />
                <input
                  className="form-input"
                  placeholder="الموظف"
                  value={observationForm.employee}
                  onChange={e => setObservationForm({...observationForm, employee:e.target.value})}
                />
                <input
                  className="form-input"
                  placeholder="السفينة"
                  value={observationForm.ship}
                  onChange={e => setObservationForm({...observationForm, ship:e.target.value})}
                />
                <input
                  className="form-input"
                  placeholder="المشاهدة"
                  value={observationForm.observation}
                  onChange={e => setObservationForm({...observationForm, observation:e.target.value})}
                />
                <input
                  className="form-input"
                  placeholder="ملاحظات"
                  value={observationForm.notes}
                  onChange={e => setObservationForm({...observationForm, notes:e.target.value})}
                />
                <button className="btn btn-primary">➕ إضافة مشاهدة</button>
              </form>

              {/* فلتر البحث المتقدم */}
              <div className="filters-row">
                <select value={filterField} onChange={e=>setFilterField(e.target.value)}>
                  <option value="all">كل الحقول</option>
                  <option value="employee">الموظف</option>
                  <option value="ship">السفينة</option>
                  <option value="date">التاريخ</option>
                </select>

                <input
                  type="text"
                  className="filter-input"
                  placeholder="بحث..."
                  value={searchText}
                  onChange={e=>setSearchText(e.target.value)}
                />
              </div>

              <div className="filters-row">
                <input type="file" onChange={e=>setExcelFile(e.target.files[0])}/>
                <button className="btn btn-secondary" onClick={handleImportExcel}>📥 استيراد Excel</button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الوقت</th>
                      <th>الموظف</th>
                      <th>السفينة</th>
                      <th>المشاهدة</th>
                      <th>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredObservations].reverse().map(o => (
                      <tr key={o.id}>
                        <td>{o.date}</td>
                        <td>{o.time}</td>
                        <td>{o.employee}</td>
                        <td>{o.ship}</td>
                        <td>{o.observation}</td>
                        <td>{o.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );

  return user ? renderDashboard() : renderLogin();
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);