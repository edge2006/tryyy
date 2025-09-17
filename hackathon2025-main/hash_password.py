from werkzeug.security import generate_password_hash
import getpass

def main():
    """
    A simple utility to securely hash a password for the users.json file.
    """
    print("--- Password Hash Generator ---")
    print("This script will create a secure password hash for your application.")

    # Use getpass to hide the password as it's typed
    password = getpass.getpass("Please enter the password for the employee account: ")
    password_confirm = getpass.getpass("Confirm the password: ")

    if password != password_confirm:
        print("\n[ERROR] Passwords do not match. Please run the script again.")
        return

    if not password:
        print("\n[ERROR] Password cannot be empty. Please run the script again.")
        return

    # Generate a secure hash using the recommended method
    # This includes the algorithm, salt, and hash all in one string
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

    print("\n--- ✅ Hash Generated Successfully! ---")
    print("Copy the entire line below and paste it into your users.json file, replacing the old 'password_hash' value.")
    print("\nYour new password hash is:")
    print(f"'{hashed_password}'")
    print("\n--------------------------------------")


if __name__ == "__main__":
    main()
