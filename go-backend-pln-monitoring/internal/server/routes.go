package server

import (
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
	resp := fiber.Map{
		"user_id": c.Locals("user_id"),
		"roles":   c.Locals("roles"),
		"unit":    c.Locals("unit"),
	}

	return c.JSON(resp)
}
