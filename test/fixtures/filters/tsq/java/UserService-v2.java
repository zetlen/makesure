package com.example.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public class UserService {
    private final Map<String, User> users = new HashMap<>();
    private final AuditLogger auditLogger;

    public UserService(AuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }

    public Optional<User> findById(String id) {
        return Optional.ofNullable(users.get(id));
    }

    public Optional<User> findByEmail(String email) {
        return users.values().stream()
            .filter(u -> u.getEmail().equals(email))
            .findFirst();
    }

    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }

    public List<User> findByRole(UserRole role) {
        return users.values().stream()
            .filter(u -> u.getRole() == role)
            .collect(Collectors.toList());
    }

    public void save(User user) {
        users.put(user.getId(), user);
        auditLogger.log("User saved: " + user.getId());
    }

    public void delete(String id) {
        users.remove(id);
        auditLogger.log("User deleted: " + id);
    }

    public void updateEmail(String id, String newEmail) {
        findById(id).ifPresent(user -> {
            user.setEmail(newEmail);
            save(user);
        });
    }
}

class User {
    private String id;
    private String name;
    private String email;
    private UserRole role;
    private LocalDateTime createdAt;

    public User(String id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = UserRole.USER;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

enum UserRole {
    ADMIN, USER, GUEST, MODERATOR
}

interface UserRepository {
    Optional<User> findById(String id);
    Optional<User> findByEmail(String email);
    List<User> findAll();
    void save(User user);
    void delete(String id);
}

interface AuditLogger {
    void log(String message);
}

class ProductService {
    private final Map<String, Product> products = new HashMap<>();

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(products.get(id));
    }

    public List<Product> findByCategory(String category) {
        return products.values().stream()
            .filter(p -> p.getCategory().equals(category))
            .collect(Collectors.toList());
    }

    public void save(Product product) {
        products.put(product.getId(), product);
    }
}

class Product {
    private String id;
    private String name;
    private double price;
    private String category;

    public Product(String id, String name, double price, String category) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.category = category;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public double getPrice() {
        return price;
    }

    public String getCategory() {
        return category;
    }
}
