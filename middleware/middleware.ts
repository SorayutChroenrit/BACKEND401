import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify JWT token and attach user information to the request
export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization; // Extract authorization header

    // Check if authorization header is missing or does not start with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // console.log("No token found in the request");
      return res.status(401).json({
        code: "ERROR-00-0001",
        status: "error",
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"
    // console.log("Received token on server:", token);

    const jwtSecret = process.env.JWT_SECRET || "your_secret_key"; // Secret key from environment or default

    // Verify the JWT token
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        console.error("Error verifying token:", err);
        return res.status(401).json({
          code: "ERROR-00-0001",
          status: "error",
          message: "Token verification failed",
        });
      }

      // console.log("Decoded token:", decoded);
      req.user = decoded; // Attach decoded token (user data) to the request
      // Proceed to the next middleware or route handler
      next();
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      code: "ERROR-00-0001",
      status: "error",
      message: "Internal server error",
    });
  }
}

// Middleware to verify the role of the user
export function verifyRole(requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // Check if user exists and has the necessary role
    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      // console.log("User role not authorized:", user ? user.role : "No user");
      return res.status(403).json({
        code: "ERROR-00-0002",
        status: "error",
        message: "Access denied",
      });
    }

    // console.log("User role authorized:", user.role);
    next();
  };
}
