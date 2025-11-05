package server

import (
	"fmt"
	"go-backend-pln-monitoring/internal/middleware"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func generateTestJWT() (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(time.Hour * 72).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	t, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}

	return t, nil
}
func TestHandler(t *testing.T) {
	// Create a Fiber app for testing
	app := fiber.New()
	// Inject the Fiber app into the server
	s := &FiberServer{App: app}
	// Define a route in the Fiber app
	api := app.Group("", middleware.JwtMiddleware())
	api.Get("/", s.HelloWorldHandler)

	t.Run("with valid token", func(t *testing.T) {
		// Create a test HTTP request
		req, err := http.NewRequest("GET", "/", nil)
		if err != nil {
			t.Fatalf("error creating request. Err: %v", err)
		}
		token, err := generateTestJWT()
		if err != nil {
			t.Fatalf("error generating test JWT. Err: %v", err)
		}

		req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", token))
		// Perform the request
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("error making request to server. Err: %v", err)
		}
		// Your test assertions...
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected status OK; got %v", resp.Status)
		}
		expected := "{\"message\":\"Hello World\"}"
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("error reading response body. Err: %v", err)
		}
		if expected != string(body) {
			t.Errorf("expected response body to be %v; got %v", expected, string(body))
		}
	})

	t.Run("without token", func(t *testing.T) {
		// Create a test HTTP request
		req, err := http.NewRequest("GET", "/", nil)
		if err != nil {
			t.Fatalf("error creating request. Err: %v", err)
		}
		// Perform the request
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("error making request to server. Err: %v", err)
		}
		// Your test assertions...
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("expected status Unauthorized; got %v", resp.Status)
		}
	})
}
