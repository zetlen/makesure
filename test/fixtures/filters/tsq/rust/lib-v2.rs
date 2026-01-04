use std::collections::HashMap;
use std::time::SystemTime;

#[derive(Debug, Clone, PartialEq)]
pub enum UserRole {
    Admin,
    User,
    Guest,
}

#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: UserRole,
    pub created_at: SystemTime,
}

impl User {
    pub fn new(id: String, name: String, email: String) -> Self {
        User {
            id,
            name,
            email,
            role: UserRole::User,
            created_at: SystemTime::now(),
        }
    }

    pub fn with_role(mut self, role: UserRole) -> Self {
        self.role = role;
        self
    }

    pub fn is_admin(&self) -> bool {
        self.role == UserRole::Admin
    }
}

#[derive(Debug, Clone)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub price: f64,
    pub category: String,
}

impl Product {
    pub fn new(id: String, name: String, price: f64, category: String) -> Self {
        Product { id, name, price, category }
    }
}

pub trait Repository<T> {
    fn find_by_id(&self, id: &str) -> Option<&T>;
    fn save(&mut self, item: T);
    fn delete(&mut self, id: &str) -> Option<T>;
}

pub struct UserRepository {
    users: HashMap<String, User>,
}

impl UserRepository {
    pub fn new() -> Self {
        UserRepository {
            users: HashMap::new(),
        }
    }

    pub fn find_by_email(&self, email: &str) -> Option<&User> {
        self.users.values().find(|u| u.email == email)
    }

    pub fn find_all(&self) -> Vec<&User> {
        self.users.values().collect()
    }

    pub fn find_by_role(&self, role: &UserRole) -> Vec<&User> {
        self.users.values().filter(|u| &u.role == role).collect()
    }
}

impl Repository<User> for UserRepository {
    fn find_by_id(&self, id: &str) -> Option<&User> {
        self.users.get(id)
    }

    fn save(&mut self, user: User) {
        self.users.insert(user.id.clone(), user);
    }

    fn delete(&mut self, id: &str) -> Option<User> {
        self.users.remove(id)
    }
}

pub struct ProductRepository {
    products: HashMap<String, Product>,
}

impl ProductRepository {
    pub fn new() -> Self {
        ProductRepository {
            products: HashMap::new(),
        }
    }

    pub fn find_by_category(&self, category: &str) -> Vec<&Product> {
        self.products.values().filter(|p| p.category == category).collect()
    }
}

impl Repository<Product> for ProductRepository {
    fn find_by_id(&self, id: &str) -> Option<&Product> {
        self.products.get(id)
    }

    fn save(&mut self, product: Product) {
        self.products.insert(product.id.clone(), product);
    }

    fn delete(&mut self, id: &str) -> Option<Product> {
        self.products.remove(id)
    }
}

pub fn format_user(user: &User) -> String {
    format!("{} <{}> ({:?})", user.name, user.email, user.role)
}

pub fn calculate_total(products: &[Product]) -> f64 {
    products.iter().map(|p| p.price).sum()
}

pub fn validate_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_user() {
        let user = User::new("1".to_string(), "Alice".to_string(), "alice@example.com".to_string());
        assert_eq!(user.name, "Alice");
        assert_eq!(user.role, UserRole::User);
    }

    #[test]
    fn test_user_with_role() {
        let user = User::new("1".to_string(), "Bob".to_string(), "bob@example.com".to_string())
            .with_role(UserRole::Admin);
        assert!(user.is_admin());
    }

    #[test]
    fn test_validate_email() {
        assert!(validate_email("test@example.com"));
        assert!(!validate_email("invalid"));
    }
}
