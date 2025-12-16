import { neon, NeonQueryFunction } from '@neondatabase/serverless';
    
// Connection pool singleton
class ConnectionManager {
  private static instance: ConnectionManager;
  private sql: NeonQueryFunction<any, any> | null = null;
  private lastActivity: number = Date.now();
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  private constructor() {
    // Initialize the connection
    this.initialize();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private initialize(): void {
    try {
      // Create the neon SQL client
      this.sql = neon(process.env.DATABASE_URL!);
      this.isActive = true;
      this.lastActivity = Date.now();
      
      // Start the keepalive process
      this.startKeepAlive();
      
      console.log('Database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      this.isActive = false;
    }
  }

  private startKeepAlive(): void {
    // Clear any existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    // Set up a new keepalive interval that runs every 5 minutes
    this.keepAliveInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const inactiveTime = now - this.lastActivity;
        
        // If it's been more than 4 minutes since the last activity
        if (inactiveTime > 4 * 60 * 1000) {
          console.log('Performing keepalive query to maintain connection');
          
          // Perform a very lightweight query
          const result = await this.query('SELECT 1 as ping');
          
          if (result && result[0]?.ping === 1) {
            this.lastActivity = now;
            this.isActive = true;
            console.log('Keepalive successful');
          } else {
            throw new Error('Keepalive query failed');
          }
        }
      } catch (error) {
        console.error('Keepalive failed, reinitializing connection:', error);
        this.isActive = false;
        this.initialize();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  public async query<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
    try {
      // If not active, reinitialize
      if (!this.isActive || !this.sql) {
        console.log('Connection not active, reinitializing');
        this.initialize();
      }
      
      // Check if sql is still null after initialization
      if (!this.sql) {
        throw new Error('Failed to initialize database connection');
      }
      
      // Update activity timestamp
      this.lastActivity = Date.now();
      
      // Execute the query
      const result = await this.sql(queryText, params);
      return result as T[];
    } catch (error) {
      console.error('Query execution failed:', error);
      
      // Try to reinitialize on failure
      this.isActive = false;
      this.initialize();
      
      // Re-throw the error so the caller can handle it
      throw error;
    }
  }
  
  // Method to explicitly clean up the connection when the app is shutting down
  public cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    this.sql = null;
    this.isActive = false;
    console.log('Database connection cleaned up');
  }
}

// Export singleton instance
export const dbConnectionManager = ConnectionManager.getInstance();

// Helper function for easier query execution
export async function executeQuery<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
  return await dbConnectionManager.query<T>(queryText, params);
}