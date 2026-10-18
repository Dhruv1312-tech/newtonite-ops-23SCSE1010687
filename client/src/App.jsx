import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5001/api";

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "RESOLVED",
  "CLOSED"
];

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}


function buildWorkItemsUrl(teamId, search, status, priority, type, page) {
  const params = new URLSearchParams({
    page: String(page),
    limit: "10"
  });

  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  if (type) params.set("type", type);

  return `/teams/${teamId}/work-items?${params.toString()}`;
}


function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("opspulse_token") || ""
  );


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [items, setItems] = useState([]);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [members, setMembers] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "TASK",
    priority: "MEDIUM"
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      setTeams([]);
      setTeamId("");
      setItems([]);
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setError("");

      try {
        const [me, teamData] = await Promise.all([
          apiRequest("/auth/me", token),
          apiRequest("/teams", token)
        ]);

        if (cancelled) return;

        const accessibleTeams = (teamData.teams || []).filter(
          (team) =>
            (me.user?.memberships || []).some(
              (membership) => membership.team.id === team.id
            )
        );

        setUser(me.user);
        setTeams(accessibleTeams);
        setTeamId((current) =>
          accessibleTeams.some((team) => team.id === current)
            ? current
            : accessibleTeams[0]?.id || ""
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          if (err.status === 401) logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !teamId) {
      setItems([]);
      return;
    }

    let cancelled = false;

    async function loadItems() {
      try {
        
const data = await apiRequest(
  buildWorkItemsUrl(
    teamId,
    search,
    statusFilter,
    priorityFilter,
    typeFilter,
    page
  ),
  token
);

        
        if (!cancelled) {
          setItems(data.workItems || []);
          setTotalItems(data.total ?? 0);
          setTotalPages(data.totalPages || 1);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }


    loadItems();

    return () => {
      cancelled = true;
    };
  
  }, [token, teamId, search, statusFilter, priorityFilter, typeFilter, page]);



  
useEffect(() => {
  if (!token || !teamId) {
    setMembers([]);
    return;
  }

  let cancelled = false;
  setMembers([]);

  async function loadMembers() {
    try {
      const data = await apiRequest(
        `/teams/${teamId}/members`,
        token
      );

      if (!cancelled) {
        setMembers(data.team?.memberships || []);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message);
      }
    }
  }

  loadMembers();

  return () => {
    cancelled = true;
  };
}, [token, teamId]);


  function logout() {
    sessionStorage.removeItem("opspulse_token");
    setToken("");
    setNotice("");
    setError("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");


    try {
      const data = await apiRequest("/auth/login", "", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      sessionStorage.setItem("opspulse_token", data.token);
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  
  async function refreshItems() {
    if (!teamId) return;
    
    const data = await apiRequest(
      buildWorkItemsUrl(
      teamId,
      search,
      statusFilter,
      priorityFilter,
      typeFilter,
      page
    ),
    token
  );

  setItems(data.workItems || []);
  setTotalItems(data.total ?? 0);
  setTotalPages(data.totalPages || 1);
}


   

  async function createItem(event) {
    event.preventDefault();
    if (!teamId) return;

    setSaving(true);
    setError("");
    setNotice("");


    try {
      await apiRequest("/work-items", token, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          teamId
        })
      });

      setForm({
        title: "",
        description: "",
        type: "TASK",
        priority: "MEDIUM"
      });

      await refreshItems();
      setNotice("Work item created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(item, changes) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/work-items/${item.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          ...changes,
          version: item.version
        })
      });


      await refreshItems();
      setNotice("Work item updated successfully.");
    } catch (err) {
      if (err.status === 409) {
        setError("This item was updated elsewhere. Latest data loaded.");
        await refreshItems().catch(() => {});
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }


  async function openItem(item) {
  setSelectedItem(item);
  setComments([]);
  setActivities([]);
  setError("");

  try {
    const [commentData, activityData] = await Promise.all([
      apiRequest(`/work-items/${item.id}/comments`, token),
      apiRequest(`/work-items/${item.id}/activity`, token)
    ]);

    setComments(commentData.comments || []);
    setActivities(activityData.activities || []);
  } catch (err) {
    setError(err.message);
  }
}

async function addComment(event) {
  event.preventDefault();

  if (!selectedItem || !commentText.trim()) return;

  setSaving(true);
  setError("");

  try {
    await apiRequest(
      `/work-items/${selectedItem.id}/comments`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ content: commentText.trim() })
      }
    );


    setCommentText("");
    await openItem(selectedItem);
    setNotice("Comment added successfully.");
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
}


if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand-mark">O</div>
          <h1>Welcome back</h1>
          <p className="subtitle">
            Sign in to manage your team's work.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="footer-note">
            OPSPULSE · Team Operations Workspace
          </p>
        </div>
      </div>
    );
  }


  const selectedTeam = teams.find((team) => team.id === teamId);
  const role = user?.memberships?.find(
    (membership) => membership.team.id === teamId
  )?.role;

  const canEdit = ["MEMBER", "LEAD", "ADMIN"].includes(role);

  const openCount = items.filter(
    (item) => item.status === "OPEN"
  ).length;

  const progressCount = items.filter(
    (item) => item.status === "IN_PROGRESS"
  ).length;

  const completedCount = items.filter(
    (item) => ["RESOLVED", "CLOSED"].includes(item.status)
  ).length;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="small-brand">O</div>
          <div>
            <strong>OPSPULSE</strong>
            <span>Operations Workspace</span>
          </div>
        </div>

        <div className="topbar-actions">
          <span>{user?.name || "Workspace"}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">TEAM OPERATIONS</p>
            <h1>Work Dashboard</h1>
            <p>Track tasks, incidents and team progress.</p>
          </div>

           <div className="team-picker">
            <label htmlFor="team">Your team</label>
            <select
              id="team"
              value={teamId}
              onChange={(event) => {
                setTeamId(event.target.value);
                setItems([]);
                setNotice("");
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert error-alert">{error}</div>}
        {notice && <div className="alert success-alert">{notice}</div>}

        {loading && <p>Loading workspace...</p>}

        {!loading && !selectedTeam && (
          <div className="panel">
            <h2>No teams available</h2>
            <p>
              Your account is not currently assigned to a team.
            </p>
          </div>
        )}


        {selectedTeam && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Total Work Items</span>
                <strong>{items.length}</strong>
              </div>
              <div className="stat-card">
                <span>Open</span>
                <strong>{openCount}</strong>
              </div>
              <div className="stat-card">
                <span>In Progress</span>
                <strong>{progressCount}</strong>
              </div>
              <div className="stat-card">
                <span>Resolved / Closed</span>
                <strong>{completedCount}</strong>
              </div>
            </div>

            <div className="workspace-grid">
              <section className="panel work-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Work Items</h2>
                    <p>
                      {selectedTeam.name} · Your role: {role}
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      refreshItems().catch((err) =>
                        setError(err.message)
                      )
                    }
                  >
                    Refresh
                  </button>
                </div>

                
<div
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "16px"
  }}
>
  <input
    type="search"
    placeholder="Search work items..."
    aria-label="Search work items"
    value={search}
    onChange={(event) => {
      setSearch(event.target.value);
      setPage(1);
    }}
    style={{ flex: "1 1 200px", minWidth: "160px" }}
  />

  <select
    aria-label="Filter by status"
    value={statusFilter}
    onChange={(event) => {
      setStatusFilter(event.target.value);
      setPage(1);
    }}
  >
    <option value="">All statuses</option>
    {statuses.map((status) => (
      <option key={status} value={status}>
        {status.replaceAll("_", " ")}
      </option>
    ))}
  </select>

  <select
    aria-label="Filter by priority"
    value={priorityFilter}
    onChange={(event) => {
      setPriorityFilter(event.target.value);
      setPage(1);
    }}
  >
    <option value="">All priorities</option>
    {priorities.map((priority) => (
      <option key={priority} value={priority}>
        {priority}
      </option>
    ))}
  </select>

  <select
    aria-label="Filter by type"
    value={typeFilter}
    onChange={(event) => {
      setTypeFilter(event.target.value);
      setPage(1);
    }}
  >
    <option value="">All types</option>
    <option value="TASK">Task</option>
    <option value="INCIDENT">Incident</option>
  </select>
</div>


                <div className="table-wrapper">
                  <table className="work-table">
                    <thead>
                      <tr>
                        <th>Work Item</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
type="button"
className="item-link"
onClick={() => openItem(item)}
>
  {item.title}
</button>

                            <small>{item.type}</small>
                          </td>
                          <td>
                            <select
                              value={item.priority}
                              disabled={!canEdit || saving}
                              onChange={(event) =>
                                updateItem(item, {
                                  priority: event.target.value
                                })
                              }
                            >
                              {priorities.map((priority) => (
                                <option key={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={item.status}
                              disabled={!canEdit || saving}
                              onChange={(event) =>
                                updateItem(item, {
                                  status: event.target.value
                                })
                              }
                            >
                              {statuses.map((status) => (
                                <option key={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>

<td>
  <select
    value={item.assigneeId || ""}
    disabled={!canEdit || saving}
    onChange={(event) =>
      updateItem(item, {
        assigneeId: event.target.value || null
      })
    }
  >
    <option value="">Unassigned</option>

    {members.map((membership) => (
      <option
        key={membership.user.id}
        value={membership.user.id}
      >
        {membership.user.name}
      </option>
    ))}
  </select>
</td>



                     </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan="4" className="empty-state">
                            No work items yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "16px"
  }}
>
  <span>
    Showing {items.length} of {totalItems} matching work items
  </span>

  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <button
      type="button"
      className="secondary-button"
      disabled={page <= 1}
      onClick={() => setPage((current) => Math.max(1, current - 1))}
    >
      Previous
    </button>

    <span>
      Page {page} of {totalPages}
    </span>

    <button
      type="button"
      className="secondary-button"
      disabled={page >= totalPages}
      onClick={() => setPage((current) => current + 1)}
    >
      Next
    </button>
  </div>
</div>

              </section>

              <section className="panel create-panel">
                <h2>Create Work Item</h2>
                <p>Add a new task or incident.</p>

                {canEdit ? (
                  <form onSubmit={createItem} className="create-form">
                    <label>Title</label>
                    <input
                      value={form.title}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          title: event.target.value
                        })
                      }
                      placeholder="e.g. Review deployment"
                      required
                    />


                    <label>Description</label>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          description: event.target.value
                        })
                      }
                      placeholder="Describe the work item"
                      rows="4"
                      required
                    />

                    <label>Type</label>
                    <select
                      value={form.type}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          type: event.target.value
                        })
                      }
                    >
                      <option value="TASK">Task</option>
                      <option value="INCIDENT">Incident</option>
                    </select>

                    <label>Priority</label>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          priority: event.target.value
                        })
                      }
                    >
                      {priorities.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>


                    <button
                      className="primary-button"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "+ Create Work Item"}
                    </button>
                  </form>
                ) : (
                  <p>VIEWER accounts have read-only access.</p>
                )}
              </section>
            </div>

            {selectedItem && selectedItem.teamId === teamId && (
              <section className="panel details-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{selectedItem.title}</h2>
                    <p>Comments &amp; Activity History</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectedItem(null)}
                  >
                    Close
                  </button>
                </div>

                <div className="details-grid">
                  <div>
                    <h3>Comments</h3>
                    {comments.length === 0 && <p>No comments yet.</p>}
                    {comments.map((comment) => (
                      <div className="detail-entry" key={comment.id}>
                        <strong>{comment.user?.name || "User"}</strong>
                        <p>{comment.content}</p>
                        <small>{new Date(comment.createdAt).toLocaleString()}</small>
                      </div>
                    ))}

                    {canEdit && (
                      <form onSubmit={addComment} className="create-form">
                        <label htmlFor="commentText">Add Comment</label>
                        <textarea
                          id="commentText"
                          rows={3}
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          placeholder="Write a comment..."
                          required
                        />
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={saving}
                        >
                          {saving ? "Posting..." : "Post Comment"}
                        </button>
                      </form>
                    )}
                  </div>

                  <div>
                    <h3>Activity History</h3>
                    {activities.length === 0 && <p>No activity yet.</p>}
                    {activities.map((activity) => (
                      <div className="detail-entry" key={activity.id}>
                        <strong>{activity.action}</strong>
                        <p>{activity.user?.name || "User"}</p>
                        <small>{new Date(activity.createdAt).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;










