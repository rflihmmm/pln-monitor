// file: internal/middleware/jwt.go
package middleware

import (
	"os"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
)

func JwtMiddleware() fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{
			Key: []byte(os.Getenv("JWT_SECRET")),
		},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.SendStatus(fiber.StatusUnauthorized)
		},
	})
}
