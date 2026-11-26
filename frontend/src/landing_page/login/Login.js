import React, { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3002/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        alert("Login successful!");
        window.location.href = "https://zerodha-dashboard1-16u1.onrender.com/";
        return;
      } else {
        alert(data.error || "Invalid credentials");
        return;
      }
    } catch (err) {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find(
        (user) => user.email === email && user.password === password
      );

      if (user) {
        alert("Login successful!");
        window.location.href = "https://zerodha-dashboard1-16u1.onrender.com/";
      } else {
        alert("Invalid credentials");
      }
    }
  };

  return (
    <div
      className="container d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}>
      <div
        className="card shadow p-4"
        style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="mb-4 text-center">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="loginEmail" className="form-label">
              Email address
            </label>
            <input
              type="email"
              id="loginEmail"
              className="form-control"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="loginPassword" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="loginPassword"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 py-2">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
