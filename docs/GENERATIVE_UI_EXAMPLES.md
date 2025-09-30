# Generative UI Examples

Test these prompts with your bots to see the generative UI capabilities in action!

## Gantt Chart Examples

### Simple Project Timeline
```
Create a Gantt chart for a website development project with these phases:
1. Planning (2 weeks, starting Jan 1, 2024)
2. Design (3 weeks, after planning)
3. Development (6 weeks, after design)
4. Testing (2 weeks, after development)
5. Deployment (1 week, after testing)
```

### Complex Project with Dependencies
```
Show me a Gantt chart for a mobile app development project:
- Requirements: Jan 1-14, 2024
- UI/UX Design: Jan 15-Feb 4
- Backend API: Feb 5-Mar 15 (starts after requirements)
- Frontend Dev: Feb 12-Apr 1 (starts during backend)
- Testing: Apr 2-15 (after both dev tasks)
- Beta Release: Apr 16-22
- Production Launch: Apr 23
```

## Flowchart Examples

### Decision Tree
```
Create a flowchart showing the decision process for choosing a database:
1. Start with "Need to store data?"
2. If yes, ask "Structured or unstructured?"
3. For structured: SQL databases (MySQL, PostgreSQL)
4. For unstructured: NoSQL databases (MongoDB, Redis)
5. Consider scale and include "High traffic?" decision
```

### Process Workflow
```
Visualize the CI/CD pipeline process as a flowchart:
- Code commit
- Run tests
- If tests pass, build application
- If build succeeds, deploy to staging
- Run integration tests
- If all tests pass, deploy to production
- If any step fails, notify developers
```

### Authentication Flow
```
Show me a flowchart of the user authentication process:
- User enters credentials
- Check if user exists
- If not, show error
- If yes, verify password
- If password wrong, show error
- If correct, check 2FA enabled
- If enabled, request 2FA code
- Verify code
- Grant access or show error
```

## Table Examples

### Comparison Table
```
Create a comparison table of React, Vue, and Angular:
Include columns for:
- Framework name
- Initial release year
- Learning curve (Easy/Medium/Hard)
- Performance (Good/Better/Best)
- Community size (Small/Medium/Large)
- Best for (type of projects)
```

### Data Table
```
Show me a table of the top 5 programming languages with:
- Language name
- Primary use case
- Average salary (USD)
- Job market demand (High/Medium/Low)
- Difficulty level (Beginner/Intermediate/Advanced)
```

### Status Table
```
Create a project status table:
- Feature: Authentication, Database, API, Frontend, Testing, Deployment
- Status: Complete, In Progress, Not Started, Blocked
- Priority: High, Medium, Low
- Assignee: Team member names
- Deadline: Dates
```

## Code Block Examples

### Python
```
Write a Python function to calculate the Fibonacci sequence up to n numbers
```

### TypeScript
```
Show me a TypeScript interface for a User management system with CRUD operations
```

### SQL
```
Write SQL queries to create a database schema for a blog system with users, posts, and comments
```

### Bash
```
Create a bash script that backs up a directory and compresses it with a timestamp
```

## Complex Mermaid Diagrams

### Sequence Diagram
```
Create a sequence diagram for a payment processing system showing interactions between:
- Customer
- Frontend
- Backend API
- Payment Gateway
- Database
```

### Class Diagram
```
Show me a class diagram for an e-commerce system with classes:
- User
- Product
- Order
- Cart
- Payment
Include properties and relationships
```

### State Diagram
```
Create a state diagram for an order lifecycle:
- Pending
- Confirmed
- Processing
- Shipped
- Delivered
- Cancelled
- Refunded
```

### Pie Chart
```
Create a pie chart showing the distribution of programming languages used in our projects:
- JavaScript: 35%
- Python: 25%
- TypeScript: 20%
- Java: 12%
- Go: 8%
```

## Multi-Visualization Examples

### Project Planning with Multiple Views
```
Create a complete project overview for a software development project:
1. A Gantt chart showing the timeline
2. A table with task details (name, assignee, status, priority)
3. A flowchart showing the development workflow
4. Code examples for the tech stack we'll use
```

### System Architecture Documentation
```
Document a web application architecture:
1. A flowchart showing the user request flow
2. A class diagram of the main components
3. A table comparing different hosting options
4. Sample configuration code for deployment
```

### Research Paper Summary
```
Summarize this research paper [paste paper or URL]:
1. Create a table of key findings
2. Flowchart of the methodology
3. Visual representation of results (appropriate chart type)
4. Sample code if the paper includes algorithms
```

## Testing Tips

1. **Start Simple**: Begin with a basic Gantt chart or table to ensure the system is working
2. **Verify Syntax**: If a diagram doesn't render, check the mermaid syntax
3. **Iterate**: Ask the bot to modify or enhance visualizations
4. **Combine**: Request multiple visualization types in one response
5. **Be Specific**: Provide clear requirements for better results

## Bot-Specific Prompts

### For Ganttrify Pro
```
Create a Gantt chart for a 6-month product development cycle with:
- Market research phase
- Design sprints
- Development iterations
- QA testing periods
- Marketing campaign
- Product launch
Include milestones and dependencies
```

### For Poster Creator GPT
```
Convert this research abstract into a visual poster:
[Paste abstract here]

Include:
- A flowchart of the methodology
- Tables for results
- Visual elements for key findings
```

### For Microbial Biochemistry GPT
```
Create a biochemical identification workflow for Gram-negative bacteria:
1. Show the decision tree as a flowchart
2. Table of recommended tests
3. Expected results table with interpretation
```

## Troubleshooting

If visualizations don't appear:
1. Check that the code block is properly formatted with triple backticks
2. For Mermaid, ensure `mermaid` is specified as the language
3. Verify table syntax has proper header separators (`|---|---|`)
4. Try refreshing the page
5. Check browser console for errors

---

Happy visualizing! 🎨📊📈

