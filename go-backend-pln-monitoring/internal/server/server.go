package server

import (
	"github.com/gofiber/fiber/v2"

	"go-backend-pln-monitoring/internal/database"
)

type FiberServer struct {
	*fiber.App

	db database.Service
}

func New() *FiberServer {
	server := &FiberServer{
		App: fiber.New(fiber.Config{
			ServerHeader: "go-backend-pln-monitoring",
			AppName:      "go-backend-pln-monitoring",
		}),

		db: database.New(),
	}

	return server
}
