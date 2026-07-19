# How to Run the NIFTYIQPlus MCP Server

Follow these steps to connect your AI-Powered Financial Intelligence System to Claude Desktop.

## 📋 Prerequisites
- **Python 3.x** installed.
- **Claude Desktop** installed on Windows.
- **MongoDB Atlas Connection URI** in your `.env` file (located in the project root).

---

## 🚀 Step 1: Virtual Environment Setup
Ensure the virtual environment is initialized and dependencies are installed.

1. Open a terminal in the `mcp_server` directory:
   ```powershell
   cd mcp_server
   python -m venv .venv
   .\.venv\Scripts\activate
   
   # Install all requirements for both the server and the AI pipeline
   pip install -r requirements_mcp.txt
   ```

## 🛠 Step 2: Configure Claude Desktop

The MCP configuration on Windows is hidden in your user profile. 

1.  **Open the Claude Config Folder**:
    - Press `Win + R` on your keyboard.
    - Type or paste: `%APPDATA%\Claude`
    - Press **Enter**.
2.  **Locate or Create the File**:
    - Look for a file named `claude_desktop_config.json`.
    - **If it doesn't exist**: Right-click -> New -> Text Document. Name it exactly `claude_desktop_config.json` (remove the `.txt` extension!).
3.  **Apply Settings**:
    - Open the file in a text editor (Notepad, VS Code).
    - Paste the following configuration, ensuring the paths match your local setup:
   ```json
   {
     "mcpServers": {
       "NIFTYIQPlus": {
         "command": "C:\\path\\to\\your\\NIFTYIQ\\mcp_server\\.venv\\Scripts\\python.exe",
         "args": [
           "C:\\path\\to\\your\\NIFTYIQ\\mcp_server\\server.py"
         ]
       }
     }
   }
   ```
   > [!TIP]
   > Ensure all backslashes in paths are escaped as double backslashes (`\\`).

## 🔄 Step 3: Hard Reset (Critical)
Claude Desktop needs a hard reset to discover new or updated tools.

1. **Quit Claude Completely**: Right-click the Claude icon in the **Windows System Tray** (near the clock) and click **"Quit Claude"**. You can use Task Manager and End Task.
2. **Restart Claude**: Open the app again.
3. **Verify**: Look for the ⚡ icon in the chat bar and click it to see the **NIFTYIQPlus** toolset.

## 🧪 Step 4: Testing (Optional - MCP Inspector)
If you want to test the server without launching Claude Desktop, use the MCP Inspector:

```powershell
npx @modelcontextprotocol/inspector .\.venv\Scripts\python.exe server.py
```
This will open a browser-based UI where you can test each tool (e.g., `get_full_scorecard`) and see the raw JSON output from MongoDB.

---

## 📈 Proactive Usage
Once running, you can ask Claude:
- *"Give me a peer comparison for INFY"*
- *"Search for the industries currently analyzed"*
- *"I want to analyze a new ticker, can you run the pipeline?"*
