const js = String.raw;

export function Landing({
  uploadResult,
  width,
}: {
  uploadResult?: any;
  width?: string;
}) {
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

        <form method="POST" action="/" encType="multipart/form-data">
          <label>
            Resize to width:
            <input
              id="width"
              name="width"
              type="number"
              min={1}
              defaultValue="200"
            />
          </label>
          <br />
          <input id="images" name="images" type="file" multiple />
          <br />
          <button type="submit">Upload</button>{" "}
          <button id="upload" type="button">
            Upload from client
          </button>
        </form>
        <pre>
          <code id="code">
            {!!uploadResult && JSON.stringify(uploadResult, null, 2)}
          </code>
        </pre>
        <div id="display">
          {uploadResult?.images?.map(
            (image, i) =>
              !!image.key && (
                <img
                  key={"" + i + "|" + image.key}
                  src={`/image/${image.key}${
                    width ? "?aspect=p&w=" + width : ""
                  }`}
                />
              )
          )}
        </div>
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

                const display = document.getElementById("display");
                display.innerHTML = "";

                const width = document.getElementById("width").value
                
                for (const result of results) {
                  if (!result || !result.images) continue;
                  for (const image of result.images) {
                    const img = document.createElement("img");
                    img.src = "/image/" + image.key + (width ? "?aspect=p&w=" + width : "");
                    display.appendChild(img);
                  }
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
