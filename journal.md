## how the read works:
- `app.js` checks url for `?p=slug`
- if found, it hides it 
- and creates form and calls `showPage()` (in `view.js`)

- `showPage()` rejects gibberish non alphanumeric slug
- because the slug goes into query string

- `fetchPage()` asks google's gviz endpoint for one row
- column b is slug and a is timestamp
- sorting oldest first means the first person to use a slug keeps it

- google returns `parseCSV()` (thank u gh copilot)
- turns it into rows
- and we pick row whose slug matches

- the content (column c) goes in page with `textContent`
- so nothing in a page can inject HTML.