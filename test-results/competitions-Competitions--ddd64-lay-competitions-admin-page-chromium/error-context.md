# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - main [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]:
            - link "Back to App" [ref=e7] [cursor=pointer]:
              - /url: /app
              - img [ref=e8]
              - text: Back to App
            - generic [ref=e10]: Admin
          - link "Create Competition" [ref=e11] [cursor=pointer]:
            - /url: /app/admin/competitions/new
            - img [ref=e12]
            - text: Create Competition
        - generic [ref=e14]:
          - link "Bots & Weblets" [ref=e15] [cursor=pointer]:
            - /url: /app/admin
            - img [ref=e16]
            - text: Bots & Weblets
          - generic [ref=e19]:
            - img [ref=e20]
            - text: Competitions
        - generic [ref=e27]:
          - img [ref=e28]
          - generic [ref=e34]:
            - heading "No competitions yet" [level=3] [ref=e35]
            - paragraph [ref=e36]: Create your first competition to get started
          - link "Create Competition" [ref=e37] [cursor=pointer]:
            - /url: /app/admin/competitions/new
            - img [ref=e38]
            - text: Create Competition
  - button "Open Next.js Dev Tools" [ref=e44] [cursor=pointer]:
    - img [ref=e45]
  - alert [ref=e48]
```