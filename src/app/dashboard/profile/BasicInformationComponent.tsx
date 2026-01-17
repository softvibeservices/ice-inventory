// src/app/dashboard/profile/BasicInformationComponent.tsx



"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { User } from "lucide-react";
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
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: localUser._id,
          name: localUser.name,
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
        <User className="w-5 h-5" /> Basic Information
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm text-gray-600">
          Full Name
          <input
            className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
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
            className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
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
            className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
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
            className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
            value={localUser.shopName || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, shopName: e.target.value })
            }
            placeholder="Shop / Business Name"
          />
        </label>

        <label className="text-sm text-gray-600 md:col-span-2">
          Shop Address
          <input
            className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
            value={localUser.shopAddress || ""}
            onChange={(e) =>
              setLocalUser({ ...localUser, shopAddress: e.target.value })
            }
            placeholder="Shop Address"
          />
        </label>
      </div>

      <button
        onClick={updateProfile}
        disabled={loading || !isChanged}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50"
      >
        {loading ? "Saving..." : "💾 Save Changes"}
      </button>
    </div>
  );
}
