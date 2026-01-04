package handlers

import (
	"encoding/json"
	"net/http"
)

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type UserHandler struct {
	users map[string]User
}

func NewUserHandler() *UserHandler {
	return &UserHandler{
		users: make(map[string]User),
	}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	user, ok := h.users[id]
	if !ok {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	h.users[user.ID] = user
	w.WriteHeader(http.StatusCreated)
}

func formatResponse(data interface{}) ([]byte, error) {
	return json.Marshal(data)
}
