use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
}

impl User {
    pub fn new(id: String, name: String, email: String) -> Self {
        User { id, name, email }
    }
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

    pub fn find_by_id(&self, id: &str) -> Option<&User> {
        self.users.get(id)
    }

    pub fn save(&mut self, user: User) {
        self.users.insert(user.id.clone(), user);
    }

    pub fn delete(&mut self, id: &str) -> Option<User> {
        self.users.remove(id)
    }
}

pub fn format_user(user: &User) -> String {
    format!("{} <{}>", user.name, user.email)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_user() {
        let user = User::new("1".to_string(), "Alice".to_string(), "alice@example.com".to_string());
        assert_eq!(user.name, "Alice");
    }
}
