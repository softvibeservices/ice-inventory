// src/lib/managerAuth.ts
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export interface ManagerAuthResult {
  isValid: boolean;
  manager?: any;
  admin?: any;
  error?: string;
}

/**
 * Verify that a manager still exists and is authorized
 */
export async function verifyManager(
  managerId: string,
  adminId?: string
): Promise<ManagerAuthResult> {
  try {
    await connectDB();

    // Check if manager exists
    const manager = await User.findOne({
      _id: managerId,
      role: "manager"
    });
    
    if (!manager) {
      return {
        isValid: false,
        error: "Manager account not found. You may have been removed by the admin.",
      };
    }

    // Check if not pending
    if (manager.isPending) {
      return {
        isValid: false,
        error: "Manager account setup incomplete.",
      };
    }

    // If adminId is provided, verify the manager belongs to this admin
    if (adminId && String(manager.adminId) !== String(adminId)) {
      return {
        isValid: false,
        error: "Manager does not belong to this admin.",
      };
    }

    // Verify the admin still exists
    const admin = await User.findById(manager.adminId);
    if (!admin) {
      return {
        isValid: false,
        error: "Associated admin account not found.",
      };
    }

    return {
      isValid: true,
      manager,
      admin,
    };
  } catch (error) {
    console.error("Manager verification error:", error);
    return {
      isValid: false,
      error: "Failed to verify manager authentication.",
    };
  }
}

/**
 * Verify that a user (admin or manager) is authorized
 */
export async function verifyUserAuth(
  userId: string,
  role?: "admin" | "manager"
): Promise<{ isValid: boolean; user?: any; error?: string }> {
  try {
    await connectDB();

    // Check if it's a manager
    if (role === "manager") {
      const managerCheck = await verifyManager(userId);
      if (!managerCheck.isValid) {
        return {
          isValid: false,
          error: managerCheck.error,
        };
      }
      return {
        isValid: true,
        user: managerCheck.manager,
      };
    }

    // Check if it's an admin
    const user = await User.findById(userId);
    if (!user) {
      return {
        isValid: false,
        error: "User account not found.",
      };
    }

    if (role && user.role !== role) {
      return {
        isValid: false,
        error: `User is not a ${role}.`,
      };
    }

    return {
      isValid: true,
      user,
    };
  } catch (error) {
    console.error("User verification error:", error);
    return {
      isValid: false,
      error: "Failed to verify user authentication.",
    };
  }
}