
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());


const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const token = authorization.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.userId !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
};


const authorizeTeam = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const teamId = req.params.teamId;

      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: "Team ID is required"
        });
      }

      const membership = await prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: req.userId,
            teamId
          }
        }
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission"
        });
      }

      req.teamRole = membership.role;
      next();
    } catch (error) {
      console.error("Authorization error:", error.message);

      res.status(500).json({
        success: false,
        message: "Authorization check failed"
      });
    }
  };
};


const authorizeMembershipManagement = async (req, res, next) => {
  try {
    const { teamId } = req.body;

    if (typeof teamId !== "string" || !teamId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid team ID is required"
      });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: req.userId,
          teamId
        }
      }
    });

    if (
      !membership ||
      !["ADMIN", "LEAD"].includes(membership.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Only team admins or leads can manage members"
      });
    }

    if (req.body.role === "ADMIN" && membership.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admins can assign the ADMIN role"
      });
    }

    next();
  } catch (error) {
    console.error("Membership authorization error:", error.message);

    res.status(500).json({
      success: false,
      message: "Authorization check failed"
    });
  }
};




app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "OPSPULSE backend is running"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const userCount = await prisma.user.count();

    res.json({
      status: "Connected",
      database: "opspulse_db",
      totalUsers: userCount
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      status: "Error",
      message: "Database connection failed"
    });
  }
});


app.get("/api/users", authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch users"
    });
  }
});



app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid name, email and password (minimum 8 characters) are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user
    });
  } catch (error) {
    console.error("Error creating user:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create user"
    });
  }
});



app.post("/api/teams", authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Team name is required"
      });
    }

    const teamName = name.trim();

    const existingTeam = await prisma.team.findUnique({
      where: { name: teamName }
    });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: "Team already exists"
      });
    }

    
const team = await prisma.team.create({
  data: {
    name: teamName,
    memberships: {
      create: {
        userId: req.userId,
        role: "ADMIN"
      }
    }
  },
  include: {
    memberships: {
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }
  }
});

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      team
    });
  } catch (error) {
    console.error("Error creating team:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create team"
    });
  }
});



app.get("/api/teams", authenticate, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: {
        name: "asc"
      }
    });

    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error("Error fetching teams:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch teams"
    });
  }
});



app.post(
  "/api/memberships",
  authenticate,
  authorizeMembershipManagement,
  async (req, res) => {
    try {
    const { userId, teamId, role } = req.body;

    const validRoles = ["VIEWER", "MEMBER", "LEAD", "ADMIN"];

    if (
      typeof userId !== "string" ||
      typeof teamId !== "string" ||
      !validRoles.includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid userId, teamId and role are required"
      });
    }

    const [user, team] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.team.findUnique({ where: { id: teamId } })
    ]);

    if (!user || !team) {
      return res.status(404).json({
        success: false,
        message: "User or team not found"
      });
    }

    const existingMembership = await prisma.membership.findFirst({
      where: { userId, teamId }
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this team"
      });
    }

    const membership = await prisma.membership.create({
      data: { userId, teamId, role },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        team: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Member added to team successfully",
      membership
    });
  } catch (error) {
    console.error("Membership creation error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create membership"
    });
  }
});



app.get(
  "/api/teams/:teamId/members",
  authenticate,
  authorizeTeam(["VIEWER", "MEMBER", "LEAD", "ADMIN"]),
  async (req, res) => {
    try {
    const { teamId } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        memberships: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error("Error fetching team members:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch team members"
    });
  }
});



app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error"
      });
    }

    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");

    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to login"
    });
  }
});



app.get("/api/auth/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
          select: {
            role: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Profile fetch error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch user profile"
    });
  }
});





app.listen(PORT, () => {
  console.log(`OPSPULSE server running on port ${PORT}`);
});
