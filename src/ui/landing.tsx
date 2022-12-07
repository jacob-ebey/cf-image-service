const js = String.raw;

export function Landing() {
  return (
    <html>
      <head>
        <title>Image Service</title>
        <link
          rel="stylesheet"
          href="https://unpkg.com/@exampledev/new.css@1.1.3/new.css"
        />
      </head>
      <body>
        <h1>Image Service</h1>
        <p>
          A simple image service intended to be used as a service reference in
          other workers, not exposed publicly to the internet.
        </p>

        <form method="POST" action="/upload" encType="multipart/form-data">
          <input id="images" type="file" name="images" multiple />
          <button type="submit">Upload</button>
          <button id="upload" type="button">
            Upload from client
          </button>
        </form>
        <pre>
          <code id="code" />
        </pre>
        <script
          dangerouslySetInnerHTML={{
            __html: js`
              const button = document.getElementById("upload");
              button.addEventListener("click", upload);

              async function upload(event) {
                event.preventDefault();
            
                const input = document.getElementById("images");
                const results = [];
                for (const file of input.files) {
                  const response = await fetch("/upload", {
                    method: "POST",
                    body: await file.arrayBuffer(),
                  });
                  const json = await response.json();
                  results.push(json);
                }
                const code = document.getElementById("code");
                code.innerText = JSON.stringify(results, null, 2);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
