package middleware

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Authorization header is required"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Authorization header format must be Bearer {token}"})
		}
		tokenString := parts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil {
			if errors.Is(err, jwt.ErrTokenMalformed) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Malformed token"})
			} else if errors.Is(err, jwt.ErrTokenExpired) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Token is expired"})
			} else if errors.Is(err, jwt.ErrTokenNotValidYet) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Token not active yet"})
			} else {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Invalid token"})
			}
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			c.Locals("user_id", claims["sub"])
			c.Locals("roles", claims["roles"])
			c.Locals("unit", claims["unit"])
			return c.Next()
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Invalid token claims"})
	}
}
