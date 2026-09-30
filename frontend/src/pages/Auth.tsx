import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import { ApiError, authApi } from "../api/client";
import { useAuth } from "../Auth/context";

type AuthTab = "login" | "signUp";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  website: string;
}

const Auth = () => {
  const [tab, setTab] = useState<AuthTab>("login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    website: "",
  });

  const isSignUp = tab === "signUp";

  // Accept both HTMLInputElement and HTMLTextAreaElement to satisfy your component's union type
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    if (formData.website) return;

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = isSignUp
        ? await authApi.signup({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          })
        : await authApi.login(formData.email, formData.password);
      login(session.accessToken, {
        id: session.id,
        fullName: session.fullName,
        email: session.email,
      });
      const destination = location.state?.from;
      navigate(
        destination
          ? `${destination.pathname}${destination.search || ""}${destination.hash || ""}`
          : "/",
        { replace: true },
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to connect to the server. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTab = () => {
    setTab((prev) => (prev === "login" ? "signUp" : "login"));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Verifying session...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen w-screen flex-col justify-center">
      <div className="w-full min-h-screen overflow-hidden  bg-white shadow-2xl md:col-span-2 md:grid md:grid-cols-2 grid-cols-1 grid">
        {/* Left/Hero Panel */}
        <div
          className={`flex flex-col justify-between bg-green-900/90  rounded-b-3xl md:rounded-b-none p-8 text-white transition-all duration-700 ease-in-out md:p-12 ${
            isSignUp 
              ? "md:order-1 md:translate-x-0 md:rounded-r-4xl" 
              : "md:order-2 md:translate-x-0 md:rounded-l-4xl"
          }`}
        >
          <div className="w-24 h-32">
<img
              src="xpire-green.png"
              alt="Xpire Logo"
              className="h-full w-full object-contain"
            />          </div>

          <div
            key={tab}
            className="my-auto flex flex-col items-center justify-center py-12 text-center transition-all duration-500 ease-in-out animate-fadeIn">
            <h2 className="mb-4 text-3xl font-bold md:text-5xl">
              {isSignUp ? "Welcome Back!" : "Hello, Friend!"}
            </h2>
            <p className="mb-8 max-w-sm text-sm text-green-50 md:text-base">
              {isSignUp
                ? "To keep connected with us please login with your personal info."
                : "Enter your personal details and start your journey with us."}
            </p>
            <Button
              variant="ghost"
              type="button"
              onClick={toggleTab}
              className="border border-white text-white transition-colors hover:bg-white hover:text-green-600">
              {isSignUp ? "Sign In" : "Sign Up"}
            </Button>
          </div>

          <div className="text-xs text-green-100 opacity-80 text-center">
            &copy; {new Date().getFullYear()} Xpire. All rights reserved.
          </div>
        </div>

        {/* Right/Form Panel */}
        <div
          className={`flex items-center justify-center p-6 transition-all duration-700 ease-in-out md:p-12 ${
            isSignUp
              ? "md:order-2 md:translate-x-0"
              : "md:order-1 md:translate-x-0"
          }`}>
          <div
            key={tab}
            className="w-full max-w-md space-y-6 transition-all duration-500 ease-in-out animate-fadeIn">
            <div className="text-center w-full">
              <div className="flex justify-center font-bold text-green-800 md:text-xl">
              {isSignUp ? (
                "Create An Account"
              ) : (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span>Sign In To</span>
                  <img
                    src="xpire-green.png"
                    alt="Xpire Logo"
                    className="h-8 w-auto object-contain"
                  />
    </div>
  )}
</div>
              <p className="mt-2 text-sm text-gray-500">
                {isSignUp
                  ? "Fill in your information below"
                  : "Welcome back! Please enter your details"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    type="text"
                    name="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Last Name"
                    type="text"
                    name="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                label="Password"
                type="password"
                name="password"
                placeholder={isSignUp ? "Create password" : "Enter password"}
                value={formData.password}
                onChange={handleChange}
                required
              />

              {isSignUp && (
                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              )}

              {/* Honeypot field */}
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                autoComplete="off"
                tabIndex={-1}
                className="hidden"
              />

              {errorMessage && (
                <p role="alert" className="text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <Button type="submit" className="w-full bg-green-900/70" disabled={isSubmitting}>
                {isSubmitting
                  ? "Please wait..."
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
