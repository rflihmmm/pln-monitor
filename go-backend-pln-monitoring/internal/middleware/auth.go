package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing or malformed JWT"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing or malformed JWT"})
		}
		tokenString := parts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unexpected signing method"})
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired JWT"})
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			c.Locals("user_id", claims["sub"])
			c.Locals("roles", claims["roles"])
			c.Locals("unit", claims["unit"])
			return c.Next()
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired JWT"})
	}
}
