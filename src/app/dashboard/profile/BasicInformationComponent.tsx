// src/app/dashboard/profile/BasicInformationComponent.tsx

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { User, Save } from "lucide-react";
import type { UserProfile } from "@/types/profile.types";

type Props = {
  user: UserProfile;
  onUpdate: (updatedUser: UserProfile) => void;
};

export default function BasicInformationComponent({ user, onUpdate }: Props) {
  const [localUser, setLocalUser] = useState<UserProfile>(user);
  const [originalUser, setOriginalUser] = useState<UserProfile>(user);
  const [loading, setLoading] = useState(false);

  // Check if there are any changes
  const isChanged =
    localUser.name !== originalUser.name ||
    localUser.email !== originalUser.email ||
    localUser.contact !== originalUser.contact ||
    localUser.shopName !== originalUser.shopName ||
    localUser.shopAddress !== originalUser.shopAddress;

  const updateProfile = async () => {
    if (!localUser._id) {
      toast.error("User ID is missing ❌");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
const res = await fetch("/api/profile/update", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: localUser.name,       // userId removed — server uses token
    email: localUser.email,
    contact: localUser.contact,
    shopName: localUser.shopName,
    shopAddress: localUser.shopAddress,
  }),
});

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setLocalUser(data);
        setOriginalUser(data);
        onUpdate(data); // Notify parent component
        
        // Update localStorage with new user data
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            const updatedStoredUser = { ...parsed, ...data };
            localStorage.setItem("user", JSON.stringify(updatedStoredUser));
          } catch (e) {
            console.error("Failed to update localStorage:", e);
          }
        }
        
        toast.success("Profile updated successfully ✅");
      } else {
        toast.error(data.error || "Update failed ❌");
      }
    } catch (error) {
      setLoading(false);
      toast.error("Something went wrong ❌");
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
        <User className="w-5 h-5" /> Basic Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-gray-600">
          Full Name
          <input
            className="mt-1 w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
            value={localUser.name || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, name: e.target.value })
            }
            placeholder="Full Name"
          />
        </label>

        <label className="text-sm text-gray-600">
          Email
          <input
            type="email"
            className="mt-1 w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
            value={localUser.email || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, email: e.target.value })
            }
            placeholder="Email"
          />
        </label>

        <label className="text-sm text-gray-600">
          Contact Number
          <input
            type="tel"
            className="mt-1 w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
            value={localUser.contact || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, contact: e.target.value })
            }
            placeholder="Contact Number"
          />
        </label>

        <label className="text-sm text-gray-600">
          Shop / Business Name
          <input
            className="mt-1 w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
            value={localUser.shopName || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, shopName: e.target.value })
            }
            placeholder="Shop / Business Name"
          />
        </label>

        <label className="text-sm text-gray-600 md:col-span-2">
          Shop Address
          <textarea
            className="mt-1 w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all resize-none"
            value={localUser.shopAddress || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, shopAddress: e.target.value })
            }
            placeholder="Shop Address"
            rows={2}
          />
        </label>
      </div>

      <button
        onClick={updateProfile}
        disabled={loading || !isChanged}
        className="btn btn-primary"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Saving...
          </span>
        ) : (
          <><Save size={14} /> Save Changes</>
        )}
      </button>
    </div>
  );
}