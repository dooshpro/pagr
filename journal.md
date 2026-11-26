## how the read works:
`app.js` checks url for `?p=slug`
if found, it hides it 
and creates form and calls `showPage()` (in `view.js`)

`showPage()` rejects gibberish non alphanumeric slug
because the slug goes into query string

`fetchPage()` asks google's gviz endpoint for one row
column b is slug and a is timestamp
sorting oldest first means the first person to use a slug keeps it

google returns `parseCSV()` (thank u gh copilot)
turns it into rows
and we pick row whose slug matches

the content (column c) goes in page with `textContent`
so nothing in a page can inject HTML.

## funnies i found: 
`crypto.subtle` was undefined on my phone. 
opened thru laptop's LAN and the cypto api vanished. 
browsers only expose it in secure contexts, meaning https or localhost.

`the key is not extractable`
forgot to pass `true` as 3rd arg of `generateKey`
so `exportKey` refused to hand it over

tried to import private key from `d` alone. 
a private jwk also needs `x` and `y`
thats why public key is stored in the sheet

base64 broke my precious keys
standard base64 contains `+`, `/`, `=`
which jwk doesnt accept and just look ugly in sheet. 
used base64url helpers.

earlier tried `elliptic` (which gives DER signatures)
then changed to WebCrypto (gives raw 64byte r+s)