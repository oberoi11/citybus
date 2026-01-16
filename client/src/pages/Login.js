import { connectSocket } from "../helpers/socket";
import React from "react";
import { Form, message } from "antd";
import { Link } from "react-router-dom";
import { axiosInstance } from "../helpers/axiosInstance"; 
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";
import "../resourses/auth.css";

function Login() {
  const dispatch = useDispatch();

  const handleLogin = async (values) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/login", values);
      dispatch(HideLoading());

      if (response.data.success) {
        message.success(response.data.message);

        // save JWT token
        localStorage.setItem("token", response.data.data);

        // connect socket after login
        connectSocket();

        // redirect to home
        window.location.href = "/";
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  return (
    <div className="h-screen d-flex justify-content-center align-items-center auth">
      <div className="w-400 card p-3">
        <h1 className="text-lg">Transit Master - Login</h1>
        <hr />
        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please enter your email" }]}
          >
            <input type="text" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <input type="password" />
          </Form.Item>
          <div className="d-flex justify-content-between align-items-center my-3">
            <Link to="/register">Click Here To Register</Link>
            <button className="secondary-btn" type="submit">
              Login
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default Login;
