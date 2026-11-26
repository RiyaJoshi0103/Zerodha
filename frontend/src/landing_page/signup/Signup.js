import React, { useState } from "react";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("http://localhost:3002/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        alert("Signup successful, please login!");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        return;
      } else {
        alert(data.error || "Signup failed");
        return;
      }
    } catch (err) {
      let users = JSON.parse(localStorage.getItem("users")) || [];
      if (users.find((u) => u.email === email)) {
        alert("User already exists");
        return;
      }
      users.push({ email, password });
      localStorage.setItem("users", JSON.stringify(users));
      alert("Signup successful, please login!");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div
      className="container d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}>
      <div
        className="card shadow p-4"
        style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="mb-4 text-center">Create Account</h2>
        <form onSubmit={handleSignup}>
          <div className="mb-3">
            <label htmlFor="signupEmail" className="form-label">
              Email address
            </label>
            <input
              type="email"
              id="signupEmail"
              className="form-control"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="signupPassword" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="signupPassword"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="form-control"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 py-2">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
