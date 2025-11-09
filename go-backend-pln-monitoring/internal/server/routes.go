package server

import (
	"strconv"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"go-backend-pln-monitoring/internal/middleware"
)

func (s *FiberServer) RegisterFiberRoutes() {
	// Apply CORS middleware
	s.App.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Accept,Authorization,Content-Type",
		AllowCredentials: false, // credentials require explicit origins
		MaxAge:           300,
	}))

	s.App.Get("/", s.HelloWorldHandler)

	api := s.App.Group("/api", middleware.AuthMiddleware())
	api.Get("/user", s.UserHandler)

}

func (s *FiberServer) HelloWorldHandler(c *fiber.Ctx) error {
	resp := fiber.Map{
		"message": "Hello World",
	}

	return c.JSON(resp)
}

func (s *FiberServer) UserHandler(c *fiber.Ctx) error {
	var userID uint
	switch v := c.Locals("user_id").(type) {
	case float64:
		userID = uint(v)
	case string:
		id, err := strconv.Atoi(v)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Unauthorized",
			})
		}
		userID = uint(id)
	default:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthorized",
		})
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error getting user data",
		})
	}

	resp := fiber.Map{
		"user_id": c.Locals("user_id"),
		"roles":   c.Locals("roles"),
		"unit":    c.Locals("unit"),
		"email":   user.Email,
	}

	return c.JSON(resp)
}
