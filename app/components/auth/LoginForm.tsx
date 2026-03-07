"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Lock } from "lucide-react";

type LoginCardId = "student" | "employee" | "admin";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginCardConfig = {
  id: LoginCardId;
  title: string;
  form: LoginFormState;
  setForm: Dispatch<SetStateAction<LoginFormState>>;
  redirectPath?: string;
};

const INITIAL_FORM: LoginFormState = {
  email: "",
  password: "",
};

export default function LoginForm() {
  const router = useRouter();

  const [studentForm, setStudentForm] = useState<LoginFormState>(INITIAL_FORM);
  const [employeeForm, setEmployeeForm] = useState<LoginFormState>(INITIAL_FORM);
  const [adminForm, setAdminForm] = useState<LoginFormState>(INITIAL_FORM);

  const loginCards: LoginCardConfig[] = [
    {
      id: "student",
      title: "Student Login",
      form: studentForm,
      setForm: setStudentForm,
      redirectPath: "/student",
    },
    {
      id: "employee",
      title: "Employee Login",
      form: employeeForm,
      setForm: setEmployeeForm,
    },
    {
      id: "admin",
      title: "Admin Login",
      form: adminForm,
      setForm: setAdminForm,
      redirectPath: "/admin",
    },
  ];

  const handleInputChange = (
    cardId: LoginCardId,
    field: keyof LoginFormState,
    value: string
  ) => {
    const card = loginCards.find((c) => c.id === cardId);
    card?.setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (cardId: LoginCardId) => {
    const card = loginCards.find((c) => c.id === cardId);
    if (!card) return;

    const { email, password } = card.form;
    console.log(`Attempting login for ${card.title} with email: ${email}`);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("Login failed:", error.message);
        alert(`Login failed: ${error.message}`);
        return;
      }

      const data = await res.json();
      console.log("Login successful!", data);

      if (cardId !== "employee" && data.role !== cardId) {
        console.error(
          `Login failed: Invalid role (${data.role}) for ${card.title} card.`
        );
        alert("Login failed: Invalid role for this login card.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("token", data.token);

      if (cardId === "employee") {
        if (data.role === "mentor" || data.role === "faculty") {
          router.push("/teacher");
        } else if (data.role === "hod") {
          router.push("/hod");
        } else if (data.role === "security") {
          // ✅ Directs straight to the gate scanner dashboard
          router.push("/security"); 
        } else {
          alert("Unknown employee role. Please contact admin.");
        }
      } else if (card.redirectPath) {
        router.push(card.redirectPath);
      }
    } catch (err) {
      console.error("Network or server error:", err);
      alert("Network or server error. Please try again.");
    }
  };
  const handleForgotPassword = (cardId: LoginCardId) => {
    alert(`Forgot password for ${cardId} is not implemented yet.`);
  };

  return (
    <main className="flex flex-col min-h-screen items-center bg-white overscroll-none">
      <header className="w-full px-3 my-3 space-y-3">
        <div>
          <Image
            src="/images/title.png"
            alt="Title header"
            width={1242}
            height={149}
            className="w-full h-auto"
            priority
          />
        </div>
        <div className="w-full">
          <Image
            src="/images/line1.png"
            alt="Divider line"
            width={1242}
            height={1}
            className="w-full h-auto"
          />
        </div>
      </header>

      <div className="w-full px-3">
        <h1 className="w-full bg-[#1f8941] flex justify-center items-center font-['Albert_Sans-Bold'] font-bold text-white text-2xl sm:text-3xl py-3">
          QUICKPASS
        </h1>
      </div>

      <div className="w-full flex flex-wrap justify-evenly items-center grow py-6 md:px-8 lg:px-12">
        {loginCards.map((card) => (
          <section
            key={card.id}
            className="w-full my-3 sm:w-[calc(50%-12px)] md:w-[300px] bg-[#fffefc] rounded-lg border border-[#bebab9] shadow-md p-4"
            aria-labelledby={`${card.id}-title`}
          >
            <h2
              id={`${card.id}-title`}
              className="font-medium text-[#1f8941] text-2xl text-center mb-4"
            >
              {card.title}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(card.id);
              }}
              className="space-y-4"
            >
              <div className="relative">
                <User
                  size={20}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-green-700"
                />
                <input
                  type="email"
                  value={card.form.email}
                  onChange={(e) => handleInputChange(card.id, "email", e.target.value)}
                  placeholder="Email"
                  className="w-full pl-10 pr-4 py-2 border border-[#bebab9] rounded-lg"
                  required
                />
              </div>

              <div className="relative">
                <Lock
                  size={20}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-green-700"
                />
                <input
                  type="password"
                  value={card.form.password}
                  onChange={(e) => handleInputChange(card.id, "password", e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-2 border border-[#bebab9] rounded-lg"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1f8941] text-white py-2 rounded-lg text-lg hover:bg-[#1a7a39] transition duration-200 no-underline"
              >
                Login
              </button>
            </form>

            <button
              type="button"
              onClick={() => handleForgotPassword(card.id)}
              className="block mt-3 mx-auto text-sm hover:text-[#1f8941] no-underline"
            >
              Forgot Password
            </button>
          </section>
        ))}
      </div>

      <footer className="w-full mt-auto px-3 mb-3">
        <Image
          src="/bott.png"
          alt="Bottom background"
          width={1242}
          height={62}
          className="w-full h-auto"
        />
      </footer>
    </main>
  );
}