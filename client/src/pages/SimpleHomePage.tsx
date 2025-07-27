import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const SimpleHomePage = () => {
  const { user, logout, login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await register(username, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to Casino Hub 🎲
            </h1>
            <p className="text-muted-foreground">
              {isRegisterMode ? "Create your account" : "Please log in to access your gaming experience"}
            </p>
          </div>
          
          <div className="p-6 bg-card border border-border rounded-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {isRegisterMode ? "Register" : "Login"}
            </h2>
            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-3 bg-input border border-border rounded-lg text-foreground"
                    required
                  />
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-input border border-border rounded-lg text-foreground"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-input border border-border rounded-lg text-foreground"
                  required
                />
              </div>
              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? (isRegisterMode ? "Creating Account..." : "Logging in...") : (isRegisterMode ? "Register" : "Login")}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-primary hover:underline text-sm"
              >
                {isRegisterMode ? "Already have an account? Login" : "Need an account? Register"}
              </button>
            </div>
            
            <div className="mt-6 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Test Login:</strong><br/>
                Email: demo@test.com<br/>
                Password: Demo123!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome Back, {user.username}! 🎲
          </h1>
          <p className="text-muted-foreground">
            Your casino adventure awaits
          </p>
          <button 
            onClick={logout}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleHomePage;
