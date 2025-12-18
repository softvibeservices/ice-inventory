// icecream-inventory\src\app\dashboard\profile\ManagerComponent.tsx
"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";


export default function ManagerComponent({ adminId }: any) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirm: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState("");

  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const [isOtpSending, setIsOtpSending] = useState(false);
  const [passForm, setPassForm] = useState({
    password: "",
    confirm: "",
  });

  const load = async () => {
    const res = await fetch(`/api/manager?adminId=${adminId}`);
    const data = await res.json();
    if (res.ok) setList(data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const loadingToast = toast.loading("Saving...");

    if (form.password !== form.confirm) {
      toast.dismiss(loadingToast);
      return toast.error("Passwords do not match");
    }

    const res = await fetch("/api/manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, ...form }),
    });

    const data = await res.json();
    toast.dismiss(loadingToast);

    if (!res.ok) return toast.error(data.error);

    toast.success("Manager added successfully!");

    setForm({
      name: "",
      email: "",
      contact: "",
      password: "",
      confirm: "",
    });

    load();
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const del = async () => {
    const loadingToast = toast.loading("Deleting...");

    await fetch("/api/manager", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteId, adminId }),
    });

    toast.dismiss(loadingToast);

    toast.success("Manager deleted!");

    setShowDeleteConfirm(false);
    setDeleteId("");
    load();
  };

  const sendOTP = async () => {
    setIsOtpSending(true);

    const res = await fetch("/api/manager/request-password-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: selectedManagerId, adminId }),
    });

    setIsOtpSending(false);

    const data = await res.json();

    if (!res.ok) return toast.error(data.error);

    toast.success("OTP sent to admin email!");
    setOtpSent(true);
  };

  const changeManagerPassword = async () => {
    const loadingToast = toast.loading("Updating password...");

    if (passForm.password !== passForm.confirm) {
      toast.dismiss(loadingToast);
      return toast.error("Passwords do not match");
    }

    const res = await fetch("/api/manager/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: selectedManagerId,
        otp: otpValue.trim(),
        password: passForm.password,
        adminId,
      }),
    });

    const data = await res.json();
    toast.dismiss(loadingToast);

    if (!res.ok) return toast.error(data.error);

    toast.success("Password updated!");

    setShowPassModal(false);
    setOtpSent(false);
    setOtpValue("");
    setPassForm({ password: "", confirm: "" });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800">
        Add Manager
      </h2>

      <div className="grid md:grid-cols-2 gap-4 my-4">
        <input
          className="border p-2 rounded text-gray-500"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border p-2 rounded text-gray-500"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border p-2 rounded text-gray-500"
          placeholder="Contact"
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
        />
        <input
          className="border p-2 rounded text-gray-500"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <input
          className="border p-2 rounded text-gray-500"
          placeholder="Confirm Password"
          type="password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
      </div>

      <button
        onClick={save}
        className="bg-orange-600 text-white px-4 py-2 rounded"
      >
        Save Manager
      </button>

      <h3 className="text-lg font-semibold mt-6 text-gray-500">
        Manager List
      </h3>

      <table className="w-full mt-3 border text-gray-500">
        <tbody>
          {list.map((m: any) => (
            <tr key={m._id} className="border">
              <td className="p-2">{m.name}</td>
              <td className="p-2">{m.email}</td>
              <td className="p-2">{m.contact}</td>
              <td className="p-2 text-right space-x-2">
                <button
                  onClick={() => {
                    setSelectedManagerId(m._id);
                    setShowPassModal(true);
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Change Password
                </button>

                <button
                  onClick={() => confirmDelete(m._id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showDeleteConfirm && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-80">
            <h3 className="text-lg font-semibold text-gray-700">
              Confirm Delete
            </h3>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={del}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h3 className="text-lg font-semibold text-gray-700">
              Change Manager Password
            </h3>

            {!otpSent && (
              <button
                onClick={sendOTP}
                disabled={isOtpSending}
                className={`mt-4 px-4 py-2 rounded text-white ${
                  isOtpSending ? "bg-gray-400" : "bg-blue-600"
                }`}
              >
                {isOtpSending ? "Sending..." : "Send OTP"}
              </button>
            )}

            {otpSent && (
              <>
                <input
                  className="border p-2 w-full mt-3 rounded text-gray-500"
                  placeholder="Enter OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                />

                <input
                  className="border p-2 w-full mt-3 rounded text-gray-500"
                  placeholder="New Password"
                  type="password"
                  value={passForm.password}
                  onChange={(e) =>
                    setPassForm({ ...passForm, password: e.target.value })
                  }
                />

                <input
                  className="border p-2 w-full mt-3 rounded text-gray-500"
                  placeholder="Confirm Password"
                  type="password"
                  value={passForm.confirm}
                  onChange={(e) =>
                    setPassForm({ ...passForm, confirm: e.target.value })
                  }
                />

                <button
                  onClick={changeManagerPassword}
                  className="bg-green-600 text-white mt-4 px-4 py-2 rounded w-full"
                >
                  Update Password
                </button>
              </>
            )}

            <button
              onClick={() => {
                setShowPassModal(false);
                setOtpSent(false);
              }}
              className="mt-4 px-4 py-2 bg-gray-300 rounded w-full text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
