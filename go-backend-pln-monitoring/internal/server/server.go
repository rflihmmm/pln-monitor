package server

import (
	"github.com/gofiber/fiber/v2"
	"go-backend-pln-monitoring/internal/database"
	"go-backend-pln-monitoring/internal/repository"
)

type FiberServer struct {
	*fiber.App
	db       database.Service
	userRepo repository.UserRepository
}

func New() *FiberServer {
	db := database.New()
	server := &FiberServer{
		App: fiber.New(fiber.Config{
			ServerHeader: "go-backend-pln-monitoring",
			AppName:      "go-backend-pln-monitoring",
		}),
		db: db,
		userRepo: repository.NewUserRepository(db.GetGormDB()),
	}

	return server
}
