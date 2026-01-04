package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Category string  `json:"category"`
}

type ApiResponse struct {
	Data    interface{} `json:"data"`
	Status  int         `json:"status"`
	Message string      `json:"message,omitempty"`
}

type UserHandler struct {
	users  map[string]User
	logger *log.Logger
}

type ProductHandler struct {
	products map[string]Product
}

func NewUserHandler(logger *log.Logger) *UserHandler {
	return &UserHandler{
		users:  make(map[string]User),
		logger: logger,
	}
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		products: make(map[string]Product),
	}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	user, ok := h.users[id]
	if !ok {
		h.logger.Printf("User not found: %s", id)
		sendError(w, "User not found", http.StatusNotFound)
		return
	}
	sendJSON(w, user)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		sendError(w, "Invalid request", http.StatusBadRequest)
		return
	}
	user.CreatedAt = time.Now()
	h.users[user.ID] = user
	h.logger.Printf("User created: %s", user.ID)
	w.WriteHeader(http.StatusCreated)
	sendJSON(w, user)
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		sendError(w, "Invalid request", http.StatusBadRequest)
		return
	}
	user.ID = id
	h.users[id] = user
	sendJSON(w, user)
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	delete(h.users, id)
	w.WriteHeader(http.StatusNoContent)
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	product, ok := h.products[id]
	if !ok {
		sendError(w, "Product not found", http.StatusNotFound)
		return
	}
	sendJSON(w, product)
}

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	products := make([]Product, 0, len(h.products))
	for _, p := range h.products {
		products = append(products, p)
	}
	sendJSON(w, products)
}

func sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ApiResponse{
		Data:   data,
		Status: http.StatusOK,
	})
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ApiResponse{
		Status:  status,
		Message: message,
	})
}

func formatResponse(data interface{}) ([]byte, error) {
	return json.Marshal(ApiResponse{Data: data, Status: http.StatusOK})
}
