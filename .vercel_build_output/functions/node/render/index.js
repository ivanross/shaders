var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __require = typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require3() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data2 = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data2, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* read(parts) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else {
      yield part;
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    if (isBlob(value)) {
      length += value.size;
    } else {
      length += Buffer.byteLength(String(value));
    }
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data2) {
  if (data2[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data2.url}`);
  }
  data2[INTERNALS$2].disturbed = true;
  if (data2[INTERNALS$2].error) {
    throw data2[INTERNALS$2].error;
  }
  let { body } = data2;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = body.stream();
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data2.size > 0 && accumBytes + chunk.length > data2.size) {
        const err = new FetchError(`content size at ${data2.url} over limit: ${data2.size}`, "max-size");
        body.destroy(err);
        throw err;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    if (error2 instanceof FetchBaseError) {
      throw error2;
    } else {
      throw new FetchError(`Invalid response body while trying to fetch ${data2.url}: ${error2.message}`, "system", error2);
    }
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data2.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data2.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data2 = dataUriToBuffer$1(request.url);
      const response2 = new Response(data2, { headers: { "Content-Type": data2.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (err) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, "system", err));
      finalize();
    });
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              try {
                headers.set("Location", locationURL);
              } catch (error2) {
                reject(error2);
              }
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
        }
      }
      response_.once("end", () => {
        if (signal) {
          signal.removeEventListener("abort", abortAndFinalize);
        }
      });
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error2) => {
        reject(error2);
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error2) => {
          reject(error2);
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), (error2) => {
              reject(error2);
            });
          } else {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), (error2) => {
              reject(error2);
            });
          }
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, src, dataUriToBuffer$1, Readable, wm, Blob, fetchBlob, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ({ Readable } = import_stream.default);
    wm = new WeakMap();
    Blob = class {
      constructor(blobParts = [], options2 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let buffer;
          if (element instanceof Buffer) {
            buffer = element;
          } else if (ArrayBuffer.isView(element)) {
            buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
          } else if (element instanceof ArrayBuffer) {
            buffer = Buffer.from(element);
          } else if (element instanceof Blob) {
            buffer = element;
          } else {
            buffer = Buffer.from(typeof element === "string" ? element : String(element));
          }
          size += buffer.length || buffer.size || 0;
          return buffer;
        });
        const type = options2.type === void 0 ? "" : String(options2.type).toLowerCase();
        wm.set(this, {
          type: /[^\u0020-\u007E]/.test(type) ? "" : type,
          size,
          parts
        });
      }
      get size() {
        return wm.get(this).size;
      }
      get type() {
        return wm.get(this).type;
      }
      async text() {
        return Buffer.from(await this.arrayBuffer()).toString();
      }
      async arrayBuffer() {
        const data2 = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of this.stream()) {
          data2.set(chunk, offset);
          offset += chunk.length;
        }
        return data2.buffer;
      }
      stream() {
        return Readable.from(read(wm.get(this).parts));
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = wm.get(this).parts.values();
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            const chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
            blobParts.push(chunk);
            added += ArrayBuffer.isView(chunk) ? chunk.byteLength : chunk.size;
            relativeStart = 0;
            if (added >= span) {
              break;
            }
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        Object.assign(wm.get(blob), { size: span, parts: blobParts });
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.stream === "function" && object.stream.length === 0 && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    fetchBlob = Blob;
    Blob$1 = fetchBlob;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && object[NAME] === "AbortSignal";
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (err) => {
            const error2 = err instanceof FetchBaseError ? err : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${err.message}`, "system", err);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        body.stream().pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw err;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const err = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_CHAR" });
        throw err;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback) {
        for (const name of this.keys()) {
          callback(this.get(name), name);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status || 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal !== null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-vercel/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-vercel/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/regl/dist/regl.js
var require_regl = __commonJS({
  "node_modules/regl/dist/regl.js"(exports, module2) {
    init_shims();
    (function(global, factory) {
      typeof exports === "object" && typeof module2 !== "undefined" ? module2.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.createREGL = factory();
    })(exports, function() {
      "use strict";
      var isTypedArray = function(x) {
        return x instanceof Uint8Array || x instanceof Uint16Array || x instanceof Uint32Array || x instanceof Int8Array || x instanceof Int16Array || x instanceof Int32Array || x instanceof Float32Array || x instanceof Float64Array || x instanceof Uint8ClampedArray;
      };
      var extend = function(base2, opts) {
        var keys = Object.keys(opts);
        for (var i = 0; i < keys.length; ++i) {
          base2[keys[i]] = opts[keys[i]];
        }
        return base2;
      };
      var endl = "\n";
      function decodeB64(str) {
        if (typeof atob !== "undefined") {
          return atob(str);
        }
        return "base64:" + str;
      }
      function raise(message) {
        var error2 = new Error("(regl) " + message);
        console.error(error2);
        throw error2;
      }
      function check(pred, message) {
        if (!pred) {
          raise(message);
        }
      }
      function encolon(message) {
        if (message) {
          return ": " + message;
        }
        return "";
      }
      function checkParameter(param, possibilities, message) {
        if (!(param in possibilities)) {
          raise("unknown parameter (" + param + ")" + encolon(message) + ". possible values: " + Object.keys(possibilities).join());
        }
      }
      function checkIsTypedArray(data2, message) {
        if (!isTypedArray(data2)) {
          raise("invalid parameter type" + encolon(message) + ". must be a typed array");
        }
      }
      function standardTypeEh(value, type) {
        switch (type) {
          case "number":
            return typeof value === "number";
          case "object":
            return typeof value === "object";
          case "string":
            return typeof value === "string";
          case "boolean":
            return typeof value === "boolean";
          case "function":
            return typeof value === "function";
          case "undefined":
            return typeof value === "undefined";
          case "symbol":
            return typeof value === "symbol";
        }
      }
      function checkTypeOf(value, type, message) {
        if (!standardTypeEh(value, type)) {
          raise("invalid parameter type" + encolon(message) + ". expected " + type + ", got " + typeof value);
        }
      }
      function checkNonNegativeInt(value, message) {
        if (!(value >= 0 && (value | 0) === value)) {
          raise("invalid parameter type, (" + value + ")" + encolon(message) + ". must be a nonnegative integer");
        }
      }
      function checkOneOf(value, list, message) {
        if (list.indexOf(value) < 0) {
          raise("invalid value" + encolon(message) + ". must be one of: " + list);
        }
      }
      var constructorKeys = [
        "gl",
        "canvas",
        "container",
        "attributes",
        "pixelRatio",
        "extensions",
        "optionalExtensions",
        "profile",
        "onDone"
      ];
      function checkConstructor(obj) {
        Object.keys(obj).forEach(function(key) {
          if (constructorKeys.indexOf(key) < 0) {
            raise('invalid regl constructor argument "' + key + '". must be one of ' + constructorKeys);
          }
        });
      }
      function leftPad(str, n) {
        str = str + "";
        while (str.length < n) {
          str = " " + str;
        }
        return str;
      }
      function ShaderFile() {
        this.name = "unknown";
        this.lines = [];
        this.index = {};
        this.hasErrors = false;
      }
      function ShaderLine(number, line2) {
        this.number = number;
        this.line = line2;
        this.errors = [];
      }
      function ShaderError(fileNumber, lineNumber, message) {
        this.file = fileNumber;
        this.line = lineNumber;
        this.message = message;
      }
      function guessCommand() {
        var error2 = new Error();
        var stack = (error2.stack || error2).toString();
        var pat = /compileProcedure.*\n\s*at.*\((.*)\)/.exec(stack);
        if (pat) {
          return pat[1];
        }
        var pat2 = /compileProcedure.*\n\s*at\s+(.*)(\n|$)/.exec(stack);
        if (pat2) {
          return pat2[1];
        }
        return "unknown";
      }
      function guessCallSite() {
        var error2 = new Error();
        var stack = (error2.stack || error2).toString();
        var pat = /at REGLCommand.*\n\s+at.*\((.*)\)/.exec(stack);
        if (pat) {
          return pat[1];
        }
        var pat2 = /at REGLCommand.*\n\s+at\s+(.*)\n/.exec(stack);
        if (pat2) {
          return pat2[1];
        }
        return "unknown";
      }
      function parseSource(source, command) {
        var lines2 = source.split("\n");
        var lineNumber = 1;
        var fileNumber = 0;
        var files = {
          unknown: new ShaderFile(),
          0: new ShaderFile()
        };
        files.unknown.name = files[0].name = command || guessCommand();
        files.unknown.lines.push(new ShaderLine(0, ""));
        for (var i = 0; i < lines2.length; ++i) {
          var line2 = lines2[i];
          var parts = /^\s*#\s*(\w+)\s+(.+)\s*$/.exec(line2);
          if (parts) {
            switch (parts[1]) {
              case "line":
                var lineNumberInfo = /(\d+)(\s+\d+)?/.exec(parts[2]);
                if (lineNumberInfo) {
                  lineNumber = lineNumberInfo[1] | 0;
                  if (lineNumberInfo[2]) {
                    fileNumber = lineNumberInfo[2] | 0;
                    if (!(fileNumber in files)) {
                      files[fileNumber] = new ShaderFile();
                    }
                  }
                }
                break;
              case "define":
                var nameInfo = /SHADER_NAME(_B64)?\s+(.*)$/.exec(parts[2]);
                if (nameInfo) {
                  files[fileNumber].name = nameInfo[1] ? decodeB64(nameInfo[2]) : nameInfo[2];
                }
                break;
            }
          }
          files[fileNumber].lines.push(new ShaderLine(lineNumber++, line2));
        }
        Object.keys(files).forEach(function(fileNumber2) {
          var file = files[fileNumber2];
          file.lines.forEach(function(line3) {
            file.index[line3.number] = line3;
          });
        });
        return files;
      }
      function parseErrorLog(errLog) {
        var result = [];
        errLog.split("\n").forEach(function(errMsg) {
          if (errMsg.length < 5) {
            return;
          }
          var parts = /^ERROR:\s+(\d+):(\d+):\s*(.*)$/.exec(errMsg);
          if (parts) {
            result.push(new ShaderError(parts[1] | 0, parts[2] | 0, parts[3].trim()));
          } else if (errMsg.length > 0) {
            result.push(new ShaderError("unknown", 0, errMsg));
          }
        });
        return result;
      }
      function annotateFiles(files, errors) {
        errors.forEach(function(error2) {
          var file = files[error2.file];
          if (file) {
            var line2 = file.index[error2.line];
            if (line2) {
              line2.errors.push(error2);
              file.hasErrors = true;
              return;
            }
          }
          files.unknown.hasErrors = true;
          files.unknown.lines[0].errors.push(error2);
        });
      }
      function checkShaderError(gl, shader2, source, type, command) {
        if (!gl.getShaderParameter(shader2, gl.COMPILE_STATUS)) {
          var errLog = gl.getShaderInfoLog(shader2);
          var typeName = type === gl.FRAGMENT_SHADER ? "fragment" : "vertex";
          checkCommandType(source, "string", typeName + " shader source must be a string", command);
          var files = parseSource(source, command);
          var errors = parseErrorLog(errLog);
          annotateFiles(files, errors);
          Object.keys(files).forEach(function(fileNumber) {
            var file = files[fileNumber];
            if (!file.hasErrors) {
              return;
            }
            var strings = [""];
            var styles = [""];
            function push(str, style) {
              strings.push(str);
              styles.push(style || "");
            }
            push("file number " + fileNumber + ": " + file.name + "\n", "color:red;text-decoration:underline;font-weight:bold");
            file.lines.forEach(function(line2) {
              if (line2.errors.length > 0) {
                push(leftPad(line2.number, 4) + "|  ", "background-color:yellow; font-weight:bold");
                push(line2.line + endl, "color:red; background-color:yellow; font-weight:bold");
                var offset = 0;
                line2.errors.forEach(function(error2) {
                  var message = error2.message;
                  var token = /^\s*'(.*)'\s*:\s*(.*)$/.exec(message);
                  if (token) {
                    var tokenPat = token[1];
                    message = token[2];
                    switch (tokenPat) {
                      case "assign":
                        tokenPat = "=";
                        break;
                    }
                    offset = Math.max(line2.line.indexOf(tokenPat, offset), 0);
                  } else {
                    offset = 0;
                  }
                  push(leftPad("| ", 6));
                  push(leftPad("^^^", offset + 3) + endl, "font-weight:bold");
                  push(leftPad("| ", 6));
                  push(message + endl, "font-weight:bold");
                });
                push(leftPad("| ", 6) + endl);
              } else {
                push(leftPad(line2.number, 4) + "|  ");
                push(line2.line + endl, "color:red");
              }
            });
            if (typeof document !== "undefined" && !window.chrome) {
              styles[0] = strings.join("%c");
              console.log.apply(console, styles);
            } else {
              console.log(strings.join(""));
            }
          });
          check.raise("Error compiling " + typeName + " shader, " + files[0].name);
        }
      }
      function checkLinkError(gl, program, fragShader, vertShader, command) {
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          var errLog = gl.getProgramInfoLog(program);
          var fragParse = parseSource(fragShader, command);
          var vertParse = parseSource(vertShader, command);
          var header = 'Error linking program with vertex shader, "' + vertParse[0].name + '", and fragment shader "' + fragParse[0].name + '"';
          if (typeof document !== "undefined") {
            console.log("%c" + header + endl + "%c" + errLog, "color:red;text-decoration:underline;font-weight:bold", "color:red");
          } else {
            console.log(header + endl + errLog);
          }
          check.raise(header);
        }
      }
      function saveCommandRef(object) {
        object._commandRef = guessCommand();
      }
      function saveDrawCommandInfo(opts, uniforms, attributes, stringStore) {
        saveCommandRef(opts);
        function id(str) {
          if (str) {
            return stringStore.id(str);
          }
          return 0;
        }
        opts._fragId = id(opts.static.frag);
        opts._vertId = id(opts.static.vert);
        function addProps(dict, set) {
          Object.keys(set).forEach(function(u) {
            dict[stringStore.id(u)] = true;
          });
        }
        var uniformSet = opts._uniformSet = {};
        addProps(uniformSet, uniforms.static);
        addProps(uniformSet, uniforms.dynamic);
        var attributeSet = opts._attributeSet = {};
        addProps(attributeSet, attributes.static);
        addProps(attributeSet, attributes.dynamic);
        opts._hasCount = "count" in opts.static || "count" in opts.dynamic || "elements" in opts.static || "elements" in opts.dynamic;
      }
      function commandRaise(message, command) {
        var callSite = guessCallSite();
        raise(message + " in command " + (command || guessCommand()) + (callSite === "unknown" ? "" : " called from " + callSite));
      }
      function checkCommand(pred, message, command) {
        if (!pred) {
          commandRaise(message, command || guessCommand());
        }
      }
      function checkParameterCommand(param, possibilities, message, command) {
        if (!(param in possibilities)) {
          commandRaise("unknown parameter (" + param + ")" + encolon(message) + ". possible values: " + Object.keys(possibilities).join(), command || guessCommand());
        }
      }
      function checkCommandType(value, type, message, command) {
        if (!standardTypeEh(value, type)) {
          commandRaise("invalid parameter type" + encolon(message) + ". expected " + type + ", got " + typeof value, command || guessCommand());
        }
      }
      function checkOptional(block) {
        block();
      }
      function checkFramebufferFormat(attachment, texFormats, rbFormats) {
        if (attachment.texture) {
          checkOneOf(attachment.texture._texture.internalformat, texFormats, "unsupported texture format for attachment");
        } else {
          checkOneOf(attachment.renderbuffer._renderbuffer.format, rbFormats, "unsupported renderbuffer format for attachment");
        }
      }
      var GL_CLAMP_TO_EDGE = 33071;
      var GL_NEAREST = 9728;
      var GL_NEAREST_MIPMAP_NEAREST = 9984;
      var GL_LINEAR_MIPMAP_NEAREST = 9985;
      var GL_NEAREST_MIPMAP_LINEAR = 9986;
      var GL_LINEAR_MIPMAP_LINEAR = 9987;
      var GL_BYTE = 5120;
      var GL_UNSIGNED_BYTE = 5121;
      var GL_SHORT = 5122;
      var GL_UNSIGNED_SHORT = 5123;
      var GL_INT = 5124;
      var GL_UNSIGNED_INT = 5125;
      var GL_FLOAT = 5126;
      var GL_UNSIGNED_SHORT_4_4_4_4 = 32819;
      var GL_UNSIGNED_SHORT_5_5_5_1 = 32820;
      var GL_UNSIGNED_SHORT_5_6_5 = 33635;
      var GL_UNSIGNED_INT_24_8_WEBGL = 34042;
      var GL_HALF_FLOAT_OES = 36193;
      var TYPE_SIZE = {};
      TYPE_SIZE[GL_BYTE] = TYPE_SIZE[GL_UNSIGNED_BYTE] = 1;
      TYPE_SIZE[GL_SHORT] = TYPE_SIZE[GL_UNSIGNED_SHORT] = TYPE_SIZE[GL_HALF_FLOAT_OES] = TYPE_SIZE[GL_UNSIGNED_SHORT_5_6_5] = TYPE_SIZE[GL_UNSIGNED_SHORT_4_4_4_4] = TYPE_SIZE[GL_UNSIGNED_SHORT_5_5_5_1] = 2;
      TYPE_SIZE[GL_INT] = TYPE_SIZE[GL_UNSIGNED_INT] = TYPE_SIZE[GL_FLOAT] = TYPE_SIZE[GL_UNSIGNED_INT_24_8_WEBGL] = 4;
      function pixelSize(type, channels) {
        if (type === GL_UNSIGNED_SHORT_5_5_5_1 || type === GL_UNSIGNED_SHORT_4_4_4_4 || type === GL_UNSIGNED_SHORT_5_6_5) {
          return 2;
        } else if (type === GL_UNSIGNED_INT_24_8_WEBGL) {
          return 4;
        } else {
          return TYPE_SIZE[type] * channels;
        }
      }
      function isPow2(v) {
        return !(v & v - 1) && !!v;
      }
      function checkTexture2D(info, mipData, limits) {
        var i;
        var w = mipData.width;
        var h = mipData.height;
        var c = mipData.channels;
        check(w > 0 && w <= limits.maxTextureSize && h > 0 && h <= limits.maxTextureSize, "invalid texture shape");
        if (info.wrapS !== GL_CLAMP_TO_EDGE || info.wrapT !== GL_CLAMP_TO_EDGE) {
          check(isPow2(w) && isPow2(h), "incompatible wrap mode for texture, both width and height must be power of 2");
        }
        if (mipData.mipmask === 1) {
          if (w !== 1 && h !== 1) {
            check(info.minFilter !== GL_NEAREST_MIPMAP_NEAREST && info.minFilter !== GL_NEAREST_MIPMAP_LINEAR && info.minFilter !== GL_LINEAR_MIPMAP_NEAREST && info.minFilter !== GL_LINEAR_MIPMAP_LINEAR, "min filter requires mipmap");
          }
        } else {
          check(isPow2(w) && isPow2(h), "texture must be a square power of 2 to support mipmapping");
          check(mipData.mipmask === (w << 1) - 1, "missing or incomplete mipmap data");
        }
        if (mipData.type === GL_FLOAT) {
          if (limits.extensions.indexOf("oes_texture_float_linear") < 0) {
            check(info.minFilter === GL_NEAREST && info.magFilter === GL_NEAREST, "filter not supported, must enable oes_texture_float_linear");
          }
          check(!info.genMipmaps, "mipmap generation not supported with float textures");
        }
        var mipimages = mipData.images;
        for (i = 0; i < 16; ++i) {
          if (mipimages[i]) {
            var mw = w >> i;
            var mh = h >> i;
            check(mipData.mipmask & 1 << i, "missing mipmap data");
            var img = mipimages[i];
            check(img.width === mw && img.height === mh, "invalid shape for mip images");
            check(img.format === mipData.format && img.internalformat === mipData.internalformat && img.type === mipData.type, "incompatible type for mip image");
            if (img.compressed) {
            } else if (img.data) {
              var rowSize = Math.ceil(pixelSize(img.type, c) * mw / img.unpackAlignment) * img.unpackAlignment;
              check(img.data.byteLength === rowSize * mh, "invalid data for image, buffer size is inconsistent with image format");
            } else if (img.element) {
            } else if (img.copy) {
            }
          } else if (!info.genMipmaps) {
            check((mipData.mipmask & 1 << i) === 0, "extra mipmap data");
          }
        }
        if (mipData.compressed) {
          check(!info.genMipmaps, "mipmap generation for compressed images not supported");
        }
      }
      function checkTextureCube(texture, info, faces, limits) {
        var w = texture.width;
        var h = texture.height;
        var c = texture.channels;
        check(w > 0 && w <= limits.maxTextureSize && h > 0 && h <= limits.maxTextureSize, "invalid texture shape");
        check(w === h, "cube map must be square");
        check(info.wrapS === GL_CLAMP_TO_EDGE && info.wrapT === GL_CLAMP_TO_EDGE, "wrap mode not supported by cube map");
        for (var i = 0; i < faces.length; ++i) {
          var face = faces[i];
          check(face.width === w && face.height === h, "inconsistent cube map face shape");
          if (info.genMipmaps) {
            check(!face.compressed, "can not generate mipmap for compressed textures");
            check(face.mipmask === 1, "can not specify mipmaps and generate mipmaps");
          } else {
          }
          var mipmaps = face.images;
          for (var j = 0; j < 16; ++j) {
            var img = mipmaps[j];
            if (img) {
              var mw = w >> j;
              var mh = h >> j;
              check(face.mipmask & 1 << j, "missing mipmap data");
              check(img.width === mw && img.height === mh, "invalid shape for mip images");
              check(img.format === texture.format && img.internalformat === texture.internalformat && img.type === texture.type, "incompatible type for mip image");
              if (img.compressed) {
              } else if (img.data) {
                check(img.data.byteLength === mw * mh * Math.max(pixelSize(img.type, c), img.unpackAlignment), "invalid data for image, buffer size is inconsistent with image format");
              } else if (img.element) {
              } else if (img.copy) {
              }
            }
          }
        }
      }
      var check$1 = extend(check, {
        optional: checkOptional,
        raise,
        commandRaise,
        command: checkCommand,
        parameter: checkParameter,
        commandParameter: checkParameterCommand,
        constructor: checkConstructor,
        type: checkTypeOf,
        commandType: checkCommandType,
        isTypedArray: checkIsTypedArray,
        nni: checkNonNegativeInt,
        oneOf: checkOneOf,
        shaderError: checkShaderError,
        linkError: checkLinkError,
        callSite: guessCallSite,
        saveCommandRef,
        saveDrawInfo: saveDrawCommandInfo,
        framebufferFormat: checkFramebufferFormat,
        guessCommand,
        texture2D: checkTexture2D,
        textureCube: checkTextureCube
      });
      var VARIABLE_COUNTER = 0;
      var DYN_FUNC = 0;
      var DYN_CONSTANT = 5;
      var DYN_ARRAY = 6;
      function DynamicVariable(type, data2) {
        this.id = VARIABLE_COUNTER++;
        this.type = type;
        this.data = data2;
      }
      function escapeStr(str) {
        return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      }
      function splitParts(str) {
        if (str.length === 0) {
          return [];
        }
        var firstChar = str.charAt(0);
        var lastChar = str.charAt(str.length - 1);
        if (str.length > 1 && firstChar === lastChar && (firstChar === '"' || firstChar === "'")) {
          return ['"' + escapeStr(str.substr(1, str.length - 2)) + '"'];
        }
        var parts = /\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(str);
        if (parts) {
          return splitParts(str.substr(0, parts.index)).concat(splitParts(parts[1])).concat(splitParts(str.substr(parts.index + parts[0].length)));
        }
        var subparts = str.split(".");
        if (subparts.length === 1) {
          return ['"' + escapeStr(str) + '"'];
        }
        var result = [];
        for (var i = 0; i < subparts.length; ++i) {
          result = result.concat(splitParts(subparts[i]));
        }
        return result;
      }
      function toAccessorString(str) {
        return "[" + splitParts(str).join("][") + "]";
      }
      function defineDynamic(type, data2) {
        return new DynamicVariable(type, toAccessorString(data2 + ""));
      }
      function isDynamic(x) {
        return typeof x === "function" && !x._reglType || x instanceof DynamicVariable;
      }
      function unbox(x, path) {
        if (typeof x === "function") {
          return new DynamicVariable(DYN_FUNC, x);
        } else if (typeof x === "number" || typeof x === "boolean") {
          return new DynamicVariable(DYN_CONSTANT, x);
        } else if (Array.isArray(x)) {
          return new DynamicVariable(DYN_ARRAY, x.map(function(y, i) {
            return unbox(y, path + "[" + i + "]");
          }));
        } else if (x instanceof DynamicVariable) {
          return x;
        }
        check$1(false, "invalid option type in uniform " + path);
      }
      var dynamic = {
        DynamicVariable,
        define: defineDynamic,
        isDynamic,
        unbox,
        accessor: toAccessorString
      };
      var raf = {
        next: typeof requestAnimationFrame === "function" ? function(cb) {
          return requestAnimationFrame(cb);
        } : function(cb) {
          return setTimeout(cb, 16);
        },
        cancel: typeof cancelAnimationFrame === "function" ? function(raf2) {
          return cancelAnimationFrame(raf2);
        } : clearTimeout
      };
      var clock = typeof performance !== "undefined" && performance.now ? function() {
        return performance.now();
      } : function() {
        return +new Date();
      };
      function createStringStore() {
        var stringIds = { "": 0 };
        var stringValues = [""];
        return {
          id: function(str) {
            var result = stringIds[str];
            if (result) {
              return result;
            }
            result = stringIds[str] = stringValues.length;
            stringValues.push(str);
            return result;
          },
          str: function(id) {
            return stringValues[id];
          }
        };
      }
      function createCanvas(element, onDone, pixelRatio) {
        var canvas = document.createElement("canvas");
        extend(canvas.style, {
          border: 0,
          margin: 0,
          padding: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%"
        });
        element.appendChild(canvas);
        if (element === document.body) {
          canvas.style.position = "absolute";
          extend(element.style, {
            margin: 0,
            padding: 0
          });
        }
        function resize() {
          var w = window.innerWidth;
          var h = window.innerHeight;
          if (element !== document.body) {
            var bounds = canvas.getBoundingClientRect();
            w = bounds.right - bounds.left;
            h = bounds.bottom - bounds.top;
          }
          canvas.width = pixelRatio * w;
          canvas.height = pixelRatio * h;
        }
        var resizeObserver;
        if (element !== document.body && typeof ResizeObserver === "function") {
          resizeObserver = new ResizeObserver(function() {
            setTimeout(resize);
          });
          resizeObserver.observe(element);
        } else {
          window.addEventListener("resize", resize, false);
        }
        function onDestroy() {
          if (resizeObserver) {
            resizeObserver.disconnect();
          } else {
            window.removeEventListener("resize", resize);
          }
          element.removeChild(canvas);
        }
        resize();
        return {
          canvas,
          onDestroy
        };
      }
      function createContext(canvas, contextAttributes) {
        function get2(name) {
          try {
            return canvas.getContext(name, contextAttributes);
          } catch (e) {
            return null;
          }
        }
        return get2("webgl") || get2("experimental-webgl") || get2("webgl-experimental");
      }
      function isHTMLElement(obj) {
        return typeof obj.nodeName === "string" && typeof obj.appendChild === "function" && typeof obj.getBoundingClientRect === "function";
      }
      function isWebGLContext(obj) {
        return typeof obj.drawArrays === "function" || typeof obj.drawElements === "function";
      }
      function parseExtensions(input) {
        if (typeof input === "string") {
          return input.split();
        }
        check$1(Array.isArray(input), "invalid extension array");
        return input;
      }
      function getElement(desc) {
        if (typeof desc === "string") {
          check$1(typeof document !== "undefined", "not supported outside of DOM");
          return document.querySelector(desc);
        }
        return desc;
      }
      function parseArgs(args_) {
        var args = args_ || {};
        var element, container, canvas, gl;
        var contextAttributes = {};
        var extensions = [];
        var optionalExtensions = [];
        var pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio;
        var profile = false;
        var onDone = function(err) {
          if (err) {
            check$1.raise(err);
          }
        };
        var onDestroy = function() {
        };
        if (typeof args === "string") {
          check$1(typeof document !== "undefined", "selector queries only supported in DOM enviroments");
          element = document.querySelector(args);
          check$1(element, "invalid query string for element");
        } else if (typeof args === "object") {
          if (isHTMLElement(args)) {
            element = args;
          } else if (isWebGLContext(args)) {
            gl = args;
            canvas = gl.canvas;
          } else {
            check$1.constructor(args);
            if ("gl" in args) {
              gl = args.gl;
            } else if ("canvas" in args) {
              canvas = getElement(args.canvas);
            } else if ("container" in args) {
              container = getElement(args.container);
            }
            if ("attributes" in args) {
              contextAttributes = args.attributes;
              check$1.type(contextAttributes, "object", "invalid context attributes");
            }
            if ("extensions" in args) {
              extensions = parseExtensions(args.extensions);
            }
            if ("optionalExtensions" in args) {
              optionalExtensions = parseExtensions(args.optionalExtensions);
            }
            if ("onDone" in args) {
              check$1.type(args.onDone, "function", "invalid or missing onDone callback");
              onDone = args.onDone;
            }
            if ("profile" in args) {
              profile = !!args.profile;
            }
            if ("pixelRatio" in args) {
              pixelRatio = +args.pixelRatio;
              check$1(pixelRatio > 0, "invalid pixel ratio");
            }
          }
        } else {
          check$1.raise("invalid arguments to regl");
        }
        if (element) {
          if (element.nodeName.toLowerCase() === "canvas") {
            canvas = element;
          } else {
            container = element;
          }
        }
        if (!gl) {
          if (!canvas) {
            check$1(typeof document !== "undefined", "must manually specify webgl context outside of DOM environments");
            var result = createCanvas(container || document.body, onDone, pixelRatio);
            if (!result) {
              return null;
            }
            canvas = result.canvas;
            onDestroy = result.onDestroy;
          }
          if (contextAttributes.premultipliedAlpha === void 0)
            contextAttributes.premultipliedAlpha = true;
          gl = createContext(canvas, contextAttributes);
        }
        if (!gl) {
          onDestroy();
          onDone("webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org");
          return null;
        }
        return {
          gl,
          canvas,
          container,
          extensions,
          optionalExtensions,
          pixelRatio,
          profile,
          onDone,
          onDestroy
        };
      }
      function createExtensionCache(gl, config) {
        var extensions = {};
        function tryLoadExtension(name_) {
          check$1.type(name_, "string", "extension name must be string");
          var name2 = name_.toLowerCase();
          var ext;
          try {
            ext = extensions[name2] = gl.getExtension(name2);
          } catch (e) {
          }
          return !!ext;
        }
        for (var i = 0; i < config.extensions.length; ++i) {
          var name = config.extensions[i];
          if (!tryLoadExtension(name)) {
            config.onDestroy();
            config.onDone('"' + name + '" extension is not supported by the current WebGL context, try upgrading your system or a different browser');
            return null;
          }
        }
        config.optionalExtensions.forEach(tryLoadExtension);
        return {
          extensions,
          restore: function() {
            Object.keys(extensions).forEach(function(name2) {
              if (extensions[name2] && !tryLoadExtension(name2)) {
                throw new Error("(regl): error restoring extension " + name2);
              }
            });
          }
        };
      }
      function loop(n, f) {
        var result = Array(n);
        for (var i = 0; i < n; ++i) {
          result[i] = f(i);
        }
        return result;
      }
      var GL_BYTE$1 = 5120;
      var GL_UNSIGNED_BYTE$2 = 5121;
      var GL_SHORT$1 = 5122;
      var GL_UNSIGNED_SHORT$1 = 5123;
      var GL_INT$1 = 5124;
      var GL_UNSIGNED_INT$1 = 5125;
      var GL_FLOAT$2 = 5126;
      function nextPow16(v) {
        for (var i = 16; i <= 1 << 28; i *= 16) {
          if (v <= i) {
            return i;
          }
        }
        return 0;
      }
      function log2(v) {
        var r, shift;
        r = (v > 65535) << 4;
        v >>>= r;
        shift = (v > 255) << 3;
        v >>>= shift;
        r |= shift;
        shift = (v > 15) << 2;
        v >>>= shift;
        r |= shift;
        shift = (v > 3) << 1;
        v >>>= shift;
        r |= shift;
        return r | v >> 1;
      }
      function createPool() {
        var bufferPool = loop(8, function() {
          return [];
        });
        function alloc(n) {
          var sz = nextPow16(n);
          var bin = bufferPool[log2(sz) >> 2];
          if (bin.length > 0) {
            return bin.pop();
          }
          return new ArrayBuffer(sz);
        }
        function free(buf) {
          bufferPool[log2(buf.byteLength) >> 2].push(buf);
        }
        function allocType(type, n) {
          var result = null;
          switch (type) {
            case GL_BYTE$1:
              result = new Int8Array(alloc(n), 0, n);
              break;
            case GL_UNSIGNED_BYTE$2:
              result = new Uint8Array(alloc(n), 0, n);
              break;
            case GL_SHORT$1:
              result = new Int16Array(alloc(2 * n), 0, n);
              break;
            case GL_UNSIGNED_SHORT$1:
              result = new Uint16Array(alloc(2 * n), 0, n);
              break;
            case GL_INT$1:
              result = new Int32Array(alloc(4 * n), 0, n);
              break;
            case GL_UNSIGNED_INT$1:
              result = new Uint32Array(alloc(4 * n), 0, n);
              break;
            case GL_FLOAT$2:
              result = new Float32Array(alloc(4 * n), 0, n);
              break;
            default:
              return null;
          }
          if (result.length !== n) {
            return result.subarray(0, n);
          }
          return result;
        }
        function freeType(array) {
          free(array.buffer);
        }
        return {
          alloc,
          free,
          allocType,
          freeType
        };
      }
      var pool = createPool();
      pool.zero = createPool();
      var GL_SUBPIXEL_BITS = 3408;
      var GL_RED_BITS = 3410;
      var GL_GREEN_BITS = 3411;
      var GL_BLUE_BITS = 3412;
      var GL_ALPHA_BITS = 3413;
      var GL_DEPTH_BITS = 3414;
      var GL_STENCIL_BITS = 3415;
      var GL_ALIASED_POINT_SIZE_RANGE = 33901;
      var GL_ALIASED_LINE_WIDTH_RANGE = 33902;
      var GL_MAX_TEXTURE_SIZE = 3379;
      var GL_MAX_VIEWPORT_DIMS = 3386;
      var GL_MAX_VERTEX_ATTRIBS = 34921;
      var GL_MAX_VERTEX_UNIFORM_VECTORS = 36347;
      var GL_MAX_VARYING_VECTORS = 36348;
      var GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661;
      var GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660;
      var GL_MAX_TEXTURE_IMAGE_UNITS = 34930;
      var GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349;
      var GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076;
      var GL_MAX_RENDERBUFFER_SIZE = 34024;
      var GL_VENDOR = 7936;
      var GL_RENDERER = 7937;
      var GL_VERSION = 7938;
      var GL_SHADING_LANGUAGE_VERSION = 35724;
      var GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 34047;
      var GL_MAX_COLOR_ATTACHMENTS_WEBGL = 36063;
      var GL_MAX_DRAW_BUFFERS_WEBGL = 34852;
      var GL_TEXTURE_2D = 3553;
      var GL_TEXTURE_CUBE_MAP = 34067;
      var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069;
      var GL_TEXTURE0 = 33984;
      var GL_RGBA = 6408;
      var GL_FLOAT$1 = 5126;
      var GL_UNSIGNED_BYTE$1 = 5121;
      var GL_FRAMEBUFFER = 36160;
      var GL_FRAMEBUFFER_COMPLETE = 36053;
      var GL_COLOR_ATTACHMENT0 = 36064;
      var GL_COLOR_BUFFER_BIT$1 = 16384;
      var wrapLimits = function(gl, extensions) {
        var maxAnisotropic = 1;
        if (extensions.ext_texture_filter_anisotropic) {
          maxAnisotropic = gl.getParameter(GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        }
        var maxDrawbuffers = 1;
        var maxColorAttachments = 1;
        if (extensions.webgl_draw_buffers) {
          maxDrawbuffers = gl.getParameter(GL_MAX_DRAW_BUFFERS_WEBGL);
          maxColorAttachments = gl.getParameter(GL_MAX_COLOR_ATTACHMENTS_WEBGL);
        }
        var readFloat = !!extensions.oes_texture_float;
        if (readFloat) {
          var readFloatTexture = gl.createTexture();
          gl.bindTexture(GL_TEXTURE_2D, readFloatTexture);
          gl.texImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 1, 1, 0, GL_RGBA, GL_FLOAT$1, null);
          var fbo = gl.createFramebuffer();
          gl.bindFramebuffer(GL_FRAMEBUFFER, fbo);
          gl.framebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, readFloatTexture, 0);
          gl.bindTexture(GL_TEXTURE_2D, null);
          if (gl.checkFramebufferStatus(GL_FRAMEBUFFER) !== GL_FRAMEBUFFER_COMPLETE)
            readFloat = false;
          else {
            gl.viewport(0, 0, 1, 1);
            gl.clearColor(1, 0, 0, 1);
            gl.clear(GL_COLOR_BUFFER_BIT$1);
            var pixels = pool.allocType(GL_FLOAT$1, 4);
            gl.readPixels(0, 0, 1, 1, GL_RGBA, GL_FLOAT$1, pixels);
            if (gl.getError())
              readFloat = false;
            else {
              gl.deleteFramebuffer(fbo);
              gl.deleteTexture(readFloatTexture);
              readFloat = pixels[0] === 1;
            }
            pool.freeType(pixels);
          }
        }
        var isIE = typeof navigator !== "undefined" && (/MSIE/.test(navigator.userAgent) || /Trident\//.test(navigator.appVersion) || /Edge/.test(navigator.userAgent));
        var npotTextureCube = true;
        if (!isIE) {
          var cubeTexture = gl.createTexture();
          var data2 = pool.allocType(GL_UNSIGNED_BYTE$1, 36);
          gl.activeTexture(GL_TEXTURE0);
          gl.bindTexture(GL_TEXTURE_CUBE_MAP, cubeTexture);
          gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X, 0, GL_RGBA, 3, 3, 0, GL_RGBA, GL_UNSIGNED_BYTE$1, data2);
          pool.freeType(data2);
          gl.bindTexture(GL_TEXTURE_CUBE_MAP, null);
          gl.deleteTexture(cubeTexture);
          npotTextureCube = !gl.getError();
        }
        return {
          colorBits: [
            gl.getParameter(GL_RED_BITS),
            gl.getParameter(GL_GREEN_BITS),
            gl.getParameter(GL_BLUE_BITS),
            gl.getParameter(GL_ALPHA_BITS)
          ],
          depthBits: gl.getParameter(GL_DEPTH_BITS),
          stencilBits: gl.getParameter(GL_STENCIL_BITS),
          subpixelBits: gl.getParameter(GL_SUBPIXEL_BITS),
          extensions: Object.keys(extensions).filter(function(ext) {
            return !!extensions[ext];
          }),
          maxAnisotropic,
          maxDrawbuffers,
          maxColorAttachments,
          pointSizeDims: gl.getParameter(GL_ALIASED_POINT_SIZE_RANGE),
          lineWidthDims: gl.getParameter(GL_ALIASED_LINE_WIDTH_RANGE),
          maxViewportDims: gl.getParameter(GL_MAX_VIEWPORT_DIMS),
          maxCombinedTextureUnits: gl.getParameter(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS),
          maxCubeMapSize: gl.getParameter(GL_MAX_CUBE_MAP_TEXTURE_SIZE),
          maxRenderbufferSize: gl.getParameter(GL_MAX_RENDERBUFFER_SIZE),
          maxTextureUnits: gl.getParameter(GL_MAX_TEXTURE_IMAGE_UNITS),
          maxTextureSize: gl.getParameter(GL_MAX_TEXTURE_SIZE),
          maxAttributes: gl.getParameter(GL_MAX_VERTEX_ATTRIBS),
          maxVertexUniforms: gl.getParameter(GL_MAX_VERTEX_UNIFORM_VECTORS),
          maxVertexTextureUnits: gl.getParameter(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS),
          maxVaryingVectors: gl.getParameter(GL_MAX_VARYING_VECTORS),
          maxFragmentUniforms: gl.getParameter(GL_MAX_FRAGMENT_UNIFORM_VECTORS),
          glsl: gl.getParameter(GL_SHADING_LANGUAGE_VERSION),
          renderer: gl.getParameter(GL_RENDERER),
          vendor: gl.getParameter(GL_VENDOR),
          version: gl.getParameter(GL_VERSION),
          readFloat,
          npotTextureCube
        };
      };
      function isNDArrayLike(obj) {
        return !!obj && typeof obj === "object" && Array.isArray(obj.shape) && Array.isArray(obj.stride) && typeof obj.offset === "number" && obj.shape.length === obj.stride.length && (Array.isArray(obj.data) || isTypedArray(obj.data));
      }
      var values = function(obj) {
        return Object.keys(obj).map(function(key) {
          return obj[key];
        });
      };
      var flattenUtils = {
        shape: arrayShape$1,
        flatten: flattenArray
      };
      function flatten1D(array, nx, out) {
        for (var i = 0; i < nx; ++i) {
          out[i] = array[i];
        }
      }
      function flatten2D(array, nx, ny, out) {
        var ptr = 0;
        for (var i = 0; i < nx; ++i) {
          var row = array[i];
          for (var j = 0; j < ny; ++j) {
            out[ptr++] = row[j];
          }
        }
      }
      function flatten3D(array, nx, ny, nz, out, ptr_) {
        var ptr = ptr_;
        for (var i = 0; i < nx; ++i) {
          var row = array[i];
          for (var j = 0; j < ny; ++j) {
            var col = row[j];
            for (var k = 0; k < nz; ++k) {
              out[ptr++] = col[k];
            }
          }
        }
      }
      function flattenRec(array, shape, level, out, ptr) {
        var stride = 1;
        for (var i = level + 1; i < shape.length; ++i) {
          stride *= shape[i];
        }
        var n = shape[level];
        if (shape.length - level === 4) {
          var nx = shape[level + 1];
          var ny = shape[level + 2];
          var nz = shape[level + 3];
          for (i = 0; i < n; ++i) {
            flatten3D(array[i], nx, ny, nz, out, ptr);
            ptr += stride;
          }
        } else {
          for (i = 0; i < n; ++i) {
            flattenRec(array[i], shape, level + 1, out, ptr);
            ptr += stride;
          }
        }
      }
      function flattenArray(array, shape, type, out_) {
        var sz = 1;
        if (shape.length) {
          for (var i = 0; i < shape.length; ++i) {
            sz *= shape[i];
          }
        } else {
          sz = 0;
        }
        var out = out_ || pool.allocType(type, sz);
        switch (shape.length) {
          case 0:
            break;
          case 1:
            flatten1D(array, shape[0], out);
            break;
          case 2:
            flatten2D(array, shape[0], shape[1], out);
            break;
          case 3:
            flatten3D(array, shape[0], shape[1], shape[2], out, 0);
            break;
          default:
            flattenRec(array, shape, 0, out, 0);
        }
        return out;
      }
      function arrayShape$1(array_) {
        var shape = [];
        for (var array = array_; array.length; array = array[0]) {
          shape.push(array.length);
        }
        return shape;
      }
      var arrayTypes = {
        "[object Int8Array]": 5120,
        "[object Int16Array]": 5122,
        "[object Int32Array]": 5124,
        "[object Uint8Array]": 5121,
        "[object Uint8ClampedArray]": 5121,
        "[object Uint16Array]": 5123,
        "[object Uint32Array]": 5125,
        "[object Float32Array]": 5126,
        "[object Float64Array]": 5121,
        "[object ArrayBuffer]": 5121
      };
      var int8 = 5120;
      var int16 = 5122;
      var int32 = 5124;
      var uint8 = 5121;
      var uint16 = 5123;
      var uint32 = 5125;
      var float = 5126;
      var float32 = 5126;
      var glTypes = {
        int8,
        int16,
        int32,
        uint8,
        uint16,
        uint32,
        float,
        float32
      };
      var dynamic$1 = 35048;
      var stream = 35040;
      var usageTypes = {
        dynamic: dynamic$1,
        stream,
        "static": 35044
      };
      var arrayFlatten = flattenUtils.flatten;
      var arrayShape = flattenUtils.shape;
      var GL_STATIC_DRAW = 35044;
      var GL_STREAM_DRAW = 35040;
      var GL_UNSIGNED_BYTE$3 = 5121;
      var GL_FLOAT$3 = 5126;
      var DTYPES_SIZES = [];
      DTYPES_SIZES[5120] = 1;
      DTYPES_SIZES[5122] = 2;
      DTYPES_SIZES[5124] = 4;
      DTYPES_SIZES[5121] = 1;
      DTYPES_SIZES[5123] = 2;
      DTYPES_SIZES[5125] = 4;
      DTYPES_SIZES[5126] = 4;
      function typedArrayCode(data2) {
        return arrayTypes[Object.prototype.toString.call(data2)] | 0;
      }
      function copyArray(out, inp) {
        for (var i = 0; i < inp.length; ++i) {
          out[i] = inp[i];
        }
      }
      function transpose(result, data2, shapeX, shapeY, strideX, strideY, offset) {
        var ptr = 0;
        for (var i = 0; i < shapeX; ++i) {
          for (var j = 0; j < shapeY; ++j) {
            result[ptr++] = data2[strideX * i + strideY * j + offset];
          }
        }
      }
      function wrapBufferState(gl, stats2, config, destroyBuffer) {
        var bufferCount = 0;
        var bufferSet = {};
        function REGLBuffer(type) {
          this.id = bufferCount++;
          this.buffer = gl.createBuffer();
          this.type = type;
          this.usage = GL_STATIC_DRAW;
          this.byteLength = 0;
          this.dimension = 1;
          this.dtype = GL_UNSIGNED_BYTE$3;
          this.persistentData = null;
          if (config.profile) {
            this.stats = { size: 0 };
          }
        }
        REGLBuffer.prototype.bind = function() {
          gl.bindBuffer(this.type, this.buffer);
        };
        REGLBuffer.prototype.destroy = function() {
          destroy(this);
        };
        var streamPool = [];
        function createStream(type, data2) {
          var buffer = streamPool.pop();
          if (!buffer) {
            buffer = new REGLBuffer(type);
          }
          buffer.bind();
          initBufferFromData(buffer, data2, GL_STREAM_DRAW, 0, 1, false);
          return buffer;
        }
        function destroyStream(stream$$1) {
          streamPool.push(stream$$1);
        }
        function initBufferFromTypedArray(buffer, data2, usage) {
          buffer.byteLength = data2.byteLength;
          gl.bufferData(buffer.type, data2, usage);
        }
        function initBufferFromData(buffer, data2, usage, dtype, dimension, persist) {
          var shape;
          buffer.usage = usage;
          if (Array.isArray(data2)) {
            buffer.dtype = dtype || GL_FLOAT$3;
            if (data2.length > 0) {
              var flatData;
              if (Array.isArray(data2[0])) {
                shape = arrayShape(data2);
                var dim = 1;
                for (var i = 1; i < shape.length; ++i) {
                  dim *= shape[i];
                }
                buffer.dimension = dim;
                flatData = arrayFlatten(data2, shape, buffer.dtype);
                initBufferFromTypedArray(buffer, flatData, usage);
                if (persist) {
                  buffer.persistentData = flatData;
                } else {
                  pool.freeType(flatData);
                }
              } else if (typeof data2[0] === "number") {
                buffer.dimension = dimension;
                var typedData = pool.allocType(buffer.dtype, data2.length);
                copyArray(typedData, data2);
                initBufferFromTypedArray(buffer, typedData, usage);
                if (persist) {
                  buffer.persistentData = typedData;
                } else {
                  pool.freeType(typedData);
                }
              } else if (isTypedArray(data2[0])) {
                buffer.dimension = data2[0].length;
                buffer.dtype = dtype || typedArrayCode(data2[0]) || GL_FLOAT$3;
                flatData = arrayFlatten(data2, [data2.length, data2[0].length], buffer.dtype);
                initBufferFromTypedArray(buffer, flatData, usage);
                if (persist) {
                  buffer.persistentData = flatData;
                } else {
                  pool.freeType(flatData);
                }
              } else {
                check$1.raise("invalid buffer data");
              }
            }
          } else if (isTypedArray(data2)) {
            buffer.dtype = dtype || typedArrayCode(data2);
            buffer.dimension = dimension;
            initBufferFromTypedArray(buffer, data2, usage);
            if (persist) {
              buffer.persistentData = new Uint8Array(new Uint8Array(data2.buffer));
            }
          } else if (isNDArrayLike(data2)) {
            shape = data2.shape;
            var stride = data2.stride;
            var offset = data2.offset;
            var shapeX = 0;
            var shapeY = 0;
            var strideX = 0;
            var strideY = 0;
            if (shape.length === 1) {
              shapeX = shape[0];
              shapeY = 1;
              strideX = stride[0];
              strideY = 0;
            } else if (shape.length === 2) {
              shapeX = shape[0];
              shapeY = shape[1];
              strideX = stride[0];
              strideY = stride[1];
            } else {
              check$1.raise("invalid shape");
            }
            buffer.dtype = dtype || typedArrayCode(data2.data) || GL_FLOAT$3;
            buffer.dimension = shapeY;
            var transposeData2 = pool.allocType(buffer.dtype, shapeX * shapeY);
            transpose(transposeData2, data2.data, shapeX, shapeY, strideX, strideY, offset);
            initBufferFromTypedArray(buffer, transposeData2, usage);
            if (persist) {
              buffer.persistentData = transposeData2;
            } else {
              pool.freeType(transposeData2);
            }
          } else if (data2 instanceof ArrayBuffer) {
            buffer.dtype = GL_UNSIGNED_BYTE$3;
            buffer.dimension = dimension;
            initBufferFromTypedArray(buffer, data2, usage);
            if (persist) {
              buffer.persistentData = new Uint8Array(new Uint8Array(data2));
            }
          } else {
            check$1.raise("invalid buffer data");
          }
        }
        function destroy(buffer) {
          stats2.bufferCount--;
          destroyBuffer(buffer);
          var handle = buffer.buffer;
          check$1(handle, "buffer must not be deleted already");
          gl.deleteBuffer(handle);
          buffer.buffer = null;
          delete bufferSet[buffer.id];
        }
        function createBuffer(options2, type, deferInit, persistent) {
          stats2.bufferCount++;
          var buffer = new REGLBuffer(type);
          bufferSet[buffer.id] = buffer;
          function reglBuffer(options3) {
            var usage = GL_STATIC_DRAW;
            var data2 = null;
            var byteLength = 0;
            var dtype = 0;
            var dimension = 1;
            if (Array.isArray(options3) || isTypedArray(options3) || isNDArrayLike(options3) || options3 instanceof ArrayBuffer) {
              data2 = options3;
            } else if (typeof options3 === "number") {
              byteLength = options3 | 0;
            } else if (options3) {
              check$1.type(options3, "object", "buffer arguments must be an object, a number or an array");
              if ("data" in options3) {
                check$1(data2 === null || Array.isArray(data2) || isTypedArray(data2) || isNDArrayLike(data2), "invalid data for buffer");
                data2 = options3.data;
              }
              if ("usage" in options3) {
                check$1.parameter(options3.usage, usageTypes, "invalid buffer usage");
                usage = usageTypes[options3.usage];
              }
              if ("type" in options3) {
                check$1.parameter(options3.type, glTypes, "invalid buffer type");
                dtype = glTypes[options3.type];
              }
              if ("dimension" in options3) {
                check$1.type(options3.dimension, "number", "invalid dimension");
                dimension = options3.dimension | 0;
              }
              if ("length" in options3) {
                check$1.nni(byteLength, "buffer length must be a nonnegative integer");
                byteLength = options3.length | 0;
              }
            }
            buffer.bind();
            if (!data2) {
              if (byteLength)
                gl.bufferData(buffer.type, byteLength, usage);
              buffer.dtype = dtype || GL_UNSIGNED_BYTE$3;
              buffer.usage = usage;
              buffer.dimension = dimension;
              buffer.byteLength = byteLength;
            } else {
              initBufferFromData(buffer, data2, usage, dtype, dimension, persistent);
            }
            if (config.profile) {
              buffer.stats.size = buffer.byteLength * DTYPES_SIZES[buffer.dtype];
            }
            return reglBuffer;
          }
          function setSubData(data2, offset) {
            check$1(offset + data2.byteLength <= buffer.byteLength, "invalid buffer subdata call, buffer is too small.  Can't write data of size " + data2.byteLength + " starting from offset " + offset + " to a buffer of size " + buffer.byteLength);
            gl.bufferSubData(buffer.type, offset, data2);
          }
          function subdata(data2, offset_) {
            var offset = (offset_ || 0) | 0;
            var shape;
            buffer.bind();
            if (isTypedArray(data2) || data2 instanceof ArrayBuffer) {
              setSubData(data2, offset);
            } else if (Array.isArray(data2)) {
              if (data2.length > 0) {
                if (typeof data2[0] === "number") {
                  var converted = pool.allocType(buffer.dtype, data2.length);
                  copyArray(converted, data2);
                  setSubData(converted, offset);
                  pool.freeType(converted);
                } else if (Array.isArray(data2[0]) || isTypedArray(data2[0])) {
                  shape = arrayShape(data2);
                  var flatData = arrayFlatten(data2, shape, buffer.dtype);
                  setSubData(flatData, offset);
                  pool.freeType(flatData);
                } else {
                  check$1.raise("invalid buffer data");
                }
              }
            } else if (isNDArrayLike(data2)) {
              shape = data2.shape;
              var stride = data2.stride;
              var shapeX = 0;
              var shapeY = 0;
              var strideX = 0;
              var strideY = 0;
              if (shape.length === 1) {
                shapeX = shape[0];
                shapeY = 1;
                strideX = stride[0];
                strideY = 0;
              } else if (shape.length === 2) {
                shapeX = shape[0];
                shapeY = shape[1];
                strideX = stride[0];
                strideY = stride[1];
              } else {
                check$1.raise("invalid shape");
              }
              var dtype = Array.isArray(data2.data) ? buffer.dtype : typedArrayCode(data2.data);
              var transposeData2 = pool.allocType(dtype, shapeX * shapeY);
              transpose(transposeData2, data2.data, shapeX, shapeY, strideX, strideY, data2.offset);
              setSubData(transposeData2, offset);
              pool.freeType(transposeData2);
            } else {
              check$1.raise("invalid data for buffer subdata");
            }
            return reglBuffer;
          }
          if (!deferInit) {
            reglBuffer(options2);
          }
          reglBuffer._reglType = "buffer";
          reglBuffer._buffer = buffer;
          reglBuffer.subdata = subdata;
          if (config.profile) {
            reglBuffer.stats = buffer.stats;
          }
          reglBuffer.destroy = function() {
            destroy(buffer);
          };
          return reglBuffer;
        }
        function restoreBuffers() {
          values(bufferSet).forEach(function(buffer) {
            buffer.buffer = gl.createBuffer();
            gl.bindBuffer(buffer.type, buffer.buffer);
            gl.bufferData(buffer.type, buffer.persistentData || buffer.byteLength, buffer.usage);
          });
        }
        if (config.profile) {
          stats2.getTotalBufferSize = function() {
            var total = 0;
            Object.keys(bufferSet).forEach(function(key) {
              total += bufferSet[key].stats.size;
            });
            return total;
          };
        }
        return {
          create: createBuffer,
          createStream,
          destroyStream,
          clear: function() {
            values(bufferSet).forEach(destroy);
            streamPool.forEach(destroy);
          },
          getBuffer: function(wrapper) {
            if (wrapper && wrapper._buffer instanceof REGLBuffer) {
              return wrapper._buffer;
            }
            return null;
          },
          restore: restoreBuffers,
          _initBuffer: initBufferFromData
        };
      }
      var points = 0;
      var point = 0;
      var lines = 1;
      var line = 1;
      var triangles = 4;
      var triangle = 4;
      var primTypes = {
        points,
        point,
        lines,
        line,
        triangles,
        triangle,
        "line loop": 2,
        "line strip": 3,
        "triangle strip": 5,
        "triangle fan": 6
      };
      var GL_POINTS = 0;
      var GL_LINES = 1;
      var GL_TRIANGLES = 4;
      var GL_BYTE$2 = 5120;
      var GL_UNSIGNED_BYTE$4 = 5121;
      var GL_SHORT$2 = 5122;
      var GL_UNSIGNED_SHORT$2 = 5123;
      var GL_INT$2 = 5124;
      var GL_UNSIGNED_INT$2 = 5125;
      var GL_ELEMENT_ARRAY_BUFFER = 34963;
      var GL_STREAM_DRAW$1 = 35040;
      var GL_STATIC_DRAW$1 = 35044;
      function wrapElementsState(gl, extensions, bufferState, stats2) {
        var elementSet = {};
        var elementCount = 0;
        var elementTypes = {
          "uint8": GL_UNSIGNED_BYTE$4,
          "uint16": GL_UNSIGNED_SHORT$2
        };
        if (extensions.oes_element_index_uint) {
          elementTypes.uint32 = GL_UNSIGNED_INT$2;
        }
        function REGLElementBuffer(buffer) {
          this.id = elementCount++;
          elementSet[this.id] = this;
          this.buffer = buffer;
          this.primType = GL_TRIANGLES;
          this.vertCount = 0;
          this.type = 0;
        }
        REGLElementBuffer.prototype.bind = function() {
          this.buffer.bind();
        };
        var bufferPool = [];
        function createElementStream(data2) {
          var result = bufferPool.pop();
          if (!result) {
            result = new REGLElementBuffer(bufferState.create(null, GL_ELEMENT_ARRAY_BUFFER, true, false)._buffer);
          }
          initElements(result, data2, GL_STREAM_DRAW$1, -1, -1, 0, 0);
          return result;
        }
        function destroyElementStream(elements) {
          bufferPool.push(elements);
        }
        function initElements(elements, data2, usage, prim, count, byteLength, type) {
          elements.buffer.bind();
          var dtype;
          if (data2) {
            var predictedType = type;
            if (!type && (!isTypedArray(data2) || isNDArrayLike(data2) && !isTypedArray(data2.data))) {
              predictedType = extensions.oes_element_index_uint ? GL_UNSIGNED_INT$2 : GL_UNSIGNED_SHORT$2;
            }
            bufferState._initBuffer(elements.buffer, data2, usage, predictedType, 3);
          } else {
            gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, byteLength, usage);
            elements.buffer.dtype = dtype || GL_UNSIGNED_BYTE$4;
            elements.buffer.usage = usage;
            elements.buffer.dimension = 3;
            elements.buffer.byteLength = byteLength;
          }
          dtype = type;
          if (!type) {
            switch (elements.buffer.dtype) {
              case GL_UNSIGNED_BYTE$4:
              case GL_BYTE$2:
                dtype = GL_UNSIGNED_BYTE$4;
                break;
              case GL_UNSIGNED_SHORT$2:
              case GL_SHORT$2:
                dtype = GL_UNSIGNED_SHORT$2;
                break;
              case GL_UNSIGNED_INT$2:
              case GL_INT$2:
                dtype = GL_UNSIGNED_INT$2;
                break;
              default:
                check$1.raise("unsupported type for element array");
            }
            elements.buffer.dtype = dtype;
          }
          elements.type = dtype;
          check$1(dtype !== GL_UNSIGNED_INT$2 || !!extensions.oes_element_index_uint, "32 bit element buffers not supported, enable oes_element_index_uint first");
          var vertCount = count;
          if (vertCount < 0) {
            vertCount = elements.buffer.byteLength;
            if (dtype === GL_UNSIGNED_SHORT$2) {
              vertCount >>= 1;
            } else if (dtype === GL_UNSIGNED_INT$2) {
              vertCount >>= 2;
            }
          }
          elements.vertCount = vertCount;
          var primType = prim;
          if (prim < 0) {
            primType = GL_TRIANGLES;
            var dimension = elements.buffer.dimension;
            if (dimension === 1)
              primType = GL_POINTS;
            if (dimension === 2)
              primType = GL_LINES;
            if (dimension === 3)
              primType = GL_TRIANGLES;
          }
          elements.primType = primType;
        }
        function destroyElements(elements) {
          stats2.elementsCount--;
          check$1(elements.buffer !== null, "must not double destroy elements");
          delete elementSet[elements.id];
          elements.buffer.destroy();
          elements.buffer = null;
        }
        function createElements(options2, persistent) {
          var buffer = bufferState.create(null, GL_ELEMENT_ARRAY_BUFFER, true);
          var elements = new REGLElementBuffer(buffer._buffer);
          stats2.elementsCount++;
          function reglElements(options3) {
            if (!options3) {
              buffer();
              elements.primType = GL_TRIANGLES;
              elements.vertCount = 0;
              elements.type = GL_UNSIGNED_BYTE$4;
            } else if (typeof options3 === "number") {
              buffer(options3);
              elements.primType = GL_TRIANGLES;
              elements.vertCount = options3 | 0;
              elements.type = GL_UNSIGNED_BYTE$4;
            } else {
              var data2 = null;
              var usage = GL_STATIC_DRAW$1;
              var primType = -1;
              var vertCount = -1;
              var byteLength = 0;
              var dtype = 0;
              if (Array.isArray(options3) || isTypedArray(options3) || isNDArrayLike(options3)) {
                data2 = options3;
              } else {
                check$1.type(options3, "object", "invalid arguments for elements");
                if ("data" in options3) {
                  data2 = options3.data;
                  check$1(Array.isArray(data2) || isTypedArray(data2) || isNDArrayLike(data2), "invalid data for element buffer");
                }
                if ("usage" in options3) {
                  check$1.parameter(options3.usage, usageTypes, "invalid element buffer usage");
                  usage = usageTypes[options3.usage];
                }
                if ("primitive" in options3) {
                  check$1.parameter(options3.primitive, primTypes, "invalid element buffer primitive");
                  primType = primTypes[options3.primitive];
                }
                if ("count" in options3) {
                  check$1(typeof options3.count === "number" && options3.count >= 0, "invalid vertex count for elements");
                  vertCount = options3.count | 0;
                }
                if ("type" in options3) {
                  check$1.parameter(options3.type, elementTypes, "invalid buffer type");
                  dtype = elementTypes[options3.type];
                }
                if ("length" in options3) {
                  byteLength = options3.length | 0;
                } else {
                  byteLength = vertCount;
                  if (dtype === GL_UNSIGNED_SHORT$2 || dtype === GL_SHORT$2) {
                    byteLength *= 2;
                  } else if (dtype === GL_UNSIGNED_INT$2 || dtype === GL_INT$2) {
                    byteLength *= 4;
                  }
                }
              }
              initElements(elements, data2, usage, primType, vertCount, byteLength, dtype);
            }
            return reglElements;
          }
          reglElements(options2);
          reglElements._reglType = "elements";
          reglElements._elements = elements;
          reglElements.subdata = function(data2, offset) {
            buffer.subdata(data2, offset);
            return reglElements;
          };
          reglElements.destroy = function() {
            destroyElements(elements);
          };
          return reglElements;
        }
        return {
          create: createElements,
          createStream: createElementStream,
          destroyStream: destroyElementStream,
          getElements: function(elements) {
            if (typeof elements === "function" && elements._elements instanceof REGLElementBuffer) {
              return elements._elements;
            }
            return null;
          },
          clear: function() {
            values(elementSet).forEach(destroyElements);
          }
        };
      }
      var FLOAT = new Float32Array(1);
      var INT = new Uint32Array(FLOAT.buffer);
      var GL_UNSIGNED_SHORT$4 = 5123;
      function convertToHalfFloat(array) {
        var ushorts = pool.allocType(GL_UNSIGNED_SHORT$4, array.length);
        for (var i = 0; i < array.length; ++i) {
          if (isNaN(array[i])) {
            ushorts[i] = 65535;
          } else if (array[i] === Infinity) {
            ushorts[i] = 31744;
          } else if (array[i] === -Infinity) {
            ushorts[i] = 64512;
          } else {
            FLOAT[0] = array[i];
            var x = INT[0];
            var sgn = x >>> 31 << 15;
            var exp = (x << 1 >>> 24) - 127;
            var frac = x >> 13 & (1 << 10) - 1;
            if (exp < -24) {
              ushorts[i] = sgn;
            } else if (exp < -14) {
              var s2 = -14 - exp;
              ushorts[i] = sgn + (frac + (1 << 10) >> s2);
            } else if (exp > 15) {
              ushorts[i] = sgn + 31744;
            } else {
              ushorts[i] = sgn + (exp + 15 << 10) + frac;
            }
          }
        }
        return ushorts;
      }
      function isArrayLike(s2) {
        return Array.isArray(s2) || isTypedArray(s2);
      }
      var isPow2$1 = function(v) {
        return !(v & v - 1) && !!v;
      };
      var GL_COMPRESSED_TEXTURE_FORMATS = 34467;
      var GL_TEXTURE_2D$1 = 3553;
      var GL_TEXTURE_CUBE_MAP$1 = 34067;
      var GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 = 34069;
      var GL_RGBA$1 = 6408;
      var GL_ALPHA = 6406;
      var GL_RGB = 6407;
      var GL_LUMINANCE = 6409;
      var GL_LUMINANCE_ALPHA = 6410;
      var GL_RGBA4 = 32854;
      var GL_RGB5_A1 = 32855;
      var GL_RGB565 = 36194;
      var GL_UNSIGNED_SHORT_4_4_4_4$1 = 32819;
      var GL_UNSIGNED_SHORT_5_5_5_1$1 = 32820;
      var GL_UNSIGNED_SHORT_5_6_5$1 = 33635;
      var GL_UNSIGNED_INT_24_8_WEBGL$1 = 34042;
      var GL_DEPTH_COMPONENT = 6402;
      var GL_DEPTH_STENCIL = 34041;
      var GL_SRGB_EXT = 35904;
      var GL_SRGB_ALPHA_EXT = 35906;
      var GL_HALF_FLOAT_OES$1 = 36193;
      var GL_COMPRESSED_RGB_S3TC_DXT1_EXT = 33776;
      var GL_COMPRESSED_RGBA_S3TC_DXT1_EXT = 33777;
      var GL_COMPRESSED_RGBA_S3TC_DXT3_EXT = 33778;
      var GL_COMPRESSED_RGBA_S3TC_DXT5_EXT = 33779;
      var GL_COMPRESSED_RGB_ATC_WEBGL = 35986;
      var GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 35987;
      var GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 34798;
      var GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 35840;
      var GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 35841;
      var GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 35842;
      var GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 35843;
      var GL_COMPRESSED_RGB_ETC1_WEBGL = 36196;
      var GL_UNSIGNED_BYTE$5 = 5121;
      var GL_UNSIGNED_SHORT$3 = 5123;
      var GL_UNSIGNED_INT$3 = 5125;
      var GL_FLOAT$4 = 5126;
      var GL_TEXTURE_WRAP_S = 10242;
      var GL_TEXTURE_WRAP_T = 10243;
      var GL_REPEAT = 10497;
      var GL_CLAMP_TO_EDGE$1 = 33071;
      var GL_MIRRORED_REPEAT = 33648;
      var GL_TEXTURE_MAG_FILTER = 10240;
      var GL_TEXTURE_MIN_FILTER = 10241;
      var GL_NEAREST$1 = 9728;
      var GL_LINEAR = 9729;
      var GL_NEAREST_MIPMAP_NEAREST$1 = 9984;
      var GL_LINEAR_MIPMAP_NEAREST$1 = 9985;
      var GL_NEAREST_MIPMAP_LINEAR$1 = 9986;
      var GL_LINEAR_MIPMAP_LINEAR$1 = 9987;
      var GL_GENERATE_MIPMAP_HINT = 33170;
      var GL_DONT_CARE = 4352;
      var GL_FASTEST = 4353;
      var GL_NICEST = 4354;
      var GL_TEXTURE_MAX_ANISOTROPY_EXT = 34046;
      var GL_UNPACK_ALIGNMENT = 3317;
      var GL_UNPACK_FLIP_Y_WEBGL = 37440;
      var GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL = 37441;
      var GL_UNPACK_COLORSPACE_CONVERSION_WEBGL = 37443;
      var GL_BROWSER_DEFAULT_WEBGL = 37444;
      var GL_TEXTURE0$1 = 33984;
      var MIPMAP_FILTERS = [
        GL_NEAREST_MIPMAP_NEAREST$1,
        GL_NEAREST_MIPMAP_LINEAR$1,
        GL_LINEAR_MIPMAP_NEAREST$1,
        GL_LINEAR_MIPMAP_LINEAR$1
      ];
      var CHANNELS_FORMAT = [
        0,
        GL_LUMINANCE,
        GL_LUMINANCE_ALPHA,
        GL_RGB,
        GL_RGBA$1
      ];
      var FORMAT_CHANNELS = {};
      FORMAT_CHANNELS[GL_LUMINANCE] = FORMAT_CHANNELS[GL_ALPHA] = FORMAT_CHANNELS[GL_DEPTH_COMPONENT] = 1;
      FORMAT_CHANNELS[GL_DEPTH_STENCIL] = FORMAT_CHANNELS[GL_LUMINANCE_ALPHA] = 2;
      FORMAT_CHANNELS[GL_RGB] = FORMAT_CHANNELS[GL_SRGB_EXT] = 3;
      FORMAT_CHANNELS[GL_RGBA$1] = FORMAT_CHANNELS[GL_SRGB_ALPHA_EXT] = 4;
      function objectName(str) {
        return "[object " + str + "]";
      }
      var CANVAS_CLASS = objectName("HTMLCanvasElement");
      var OFFSCREENCANVAS_CLASS = objectName("OffscreenCanvas");
      var CONTEXT2D_CLASS = objectName("CanvasRenderingContext2D");
      var BITMAP_CLASS = objectName("ImageBitmap");
      var IMAGE_CLASS = objectName("HTMLImageElement");
      var VIDEO_CLASS = objectName("HTMLVideoElement");
      var PIXEL_CLASSES = Object.keys(arrayTypes).concat([
        CANVAS_CLASS,
        OFFSCREENCANVAS_CLASS,
        CONTEXT2D_CLASS,
        BITMAP_CLASS,
        IMAGE_CLASS,
        VIDEO_CLASS
      ]);
      var TYPE_SIZES = [];
      TYPE_SIZES[GL_UNSIGNED_BYTE$5] = 1;
      TYPE_SIZES[GL_FLOAT$4] = 4;
      TYPE_SIZES[GL_HALF_FLOAT_OES$1] = 2;
      TYPE_SIZES[GL_UNSIGNED_SHORT$3] = 2;
      TYPE_SIZES[GL_UNSIGNED_INT$3] = 4;
      var FORMAT_SIZES_SPECIAL = [];
      FORMAT_SIZES_SPECIAL[GL_RGBA4] = 2;
      FORMAT_SIZES_SPECIAL[GL_RGB5_A1] = 2;
      FORMAT_SIZES_SPECIAL[GL_RGB565] = 2;
      FORMAT_SIZES_SPECIAL[GL_DEPTH_STENCIL] = 4;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_S3TC_DXT1_EXT] = 0.5;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT1_EXT] = 0.5;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT3_EXT] = 1;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT5_EXT] = 1;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ATC_WEBGL] = 0.5;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL] = 1;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL] = 1;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG] = 0.5;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG] = 0.25;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG] = 0.5;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG] = 0.25;
      FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ETC1_WEBGL] = 0.5;
      function isNumericArray(arr) {
        return Array.isArray(arr) && (arr.length === 0 || typeof arr[0] === "number");
      }
      function isRectArray(arr) {
        if (!Array.isArray(arr)) {
          return false;
        }
        var width = arr.length;
        if (width === 0 || !isArrayLike(arr[0])) {
          return false;
        }
        return true;
      }
      function classString(x) {
        return Object.prototype.toString.call(x);
      }
      function isCanvasElement(object) {
        return classString(object) === CANVAS_CLASS;
      }
      function isOffscreenCanvas(object) {
        return classString(object) === OFFSCREENCANVAS_CLASS;
      }
      function isContext2D(object) {
        return classString(object) === CONTEXT2D_CLASS;
      }
      function isBitmap(object) {
        return classString(object) === BITMAP_CLASS;
      }
      function isImageElement(object) {
        return classString(object) === IMAGE_CLASS;
      }
      function isVideoElement(object) {
        return classString(object) === VIDEO_CLASS;
      }
      function isPixelData(object) {
        if (!object) {
          return false;
        }
        var className = classString(object);
        if (PIXEL_CLASSES.indexOf(className) >= 0) {
          return true;
        }
        return isNumericArray(object) || isRectArray(object) || isNDArrayLike(object);
      }
      function typedArrayCode$1(data2) {
        return arrayTypes[Object.prototype.toString.call(data2)] | 0;
      }
      function convertData(result, data2) {
        var n = data2.length;
        switch (result.type) {
          case GL_UNSIGNED_BYTE$5:
          case GL_UNSIGNED_SHORT$3:
          case GL_UNSIGNED_INT$3:
          case GL_FLOAT$4:
            var converted = pool.allocType(result.type, n);
            converted.set(data2);
            result.data = converted;
            break;
          case GL_HALF_FLOAT_OES$1:
            result.data = convertToHalfFloat(data2);
            break;
          default:
            check$1.raise("unsupported texture type, must specify a typed array");
        }
      }
      function preConvert(image, n) {
        return pool.allocType(image.type === GL_HALF_FLOAT_OES$1 ? GL_FLOAT$4 : image.type, n);
      }
      function postConvert(image, data2) {
        if (image.type === GL_HALF_FLOAT_OES$1) {
          image.data = convertToHalfFloat(data2);
          pool.freeType(data2);
        } else {
          image.data = data2;
        }
      }
      function transposeData(image, array, strideX, strideY, strideC, offset) {
        var w = image.width;
        var h = image.height;
        var c = image.channels;
        var n = w * h * c;
        var data2 = preConvert(image, n);
        var p = 0;
        for (var i = 0; i < h; ++i) {
          for (var j = 0; j < w; ++j) {
            for (var k = 0; k < c; ++k) {
              data2[p++] = array[strideX * j + strideY * i + strideC * k + offset];
            }
          }
        }
        postConvert(image, data2);
      }
      function getTextureSize(format2, type, width, height, isMipmap, isCube) {
        var s2;
        if (typeof FORMAT_SIZES_SPECIAL[format2] !== "undefined") {
          s2 = FORMAT_SIZES_SPECIAL[format2];
        } else {
          s2 = FORMAT_CHANNELS[format2] * TYPE_SIZES[type];
        }
        if (isCube) {
          s2 *= 6;
        }
        if (isMipmap) {
          var total = 0;
          var w = width;
          while (w >= 1) {
            total += s2 * w * w;
            w /= 2;
          }
          return total;
        } else {
          return s2 * width * height;
        }
      }
      function createTextureSet(gl, extensions, limits, reglPoll, contextState, stats2, config) {
        var mipmapHint = {
          "don't care": GL_DONT_CARE,
          "dont care": GL_DONT_CARE,
          "nice": GL_NICEST,
          "fast": GL_FASTEST
        };
        var wrapModes = {
          "repeat": GL_REPEAT,
          "clamp": GL_CLAMP_TO_EDGE$1,
          "mirror": GL_MIRRORED_REPEAT
        };
        var magFilters = {
          "nearest": GL_NEAREST$1,
          "linear": GL_LINEAR
        };
        var minFilters = extend({
          "mipmap": GL_LINEAR_MIPMAP_LINEAR$1,
          "nearest mipmap nearest": GL_NEAREST_MIPMAP_NEAREST$1,
          "linear mipmap nearest": GL_LINEAR_MIPMAP_NEAREST$1,
          "nearest mipmap linear": GL_NEAREST_MIPMAP_LINEAR$1,
          "linear mipmap linear": GL_LINEAR_MIPMAP_LINEAR$1
        }, magFilters);
        var colorSpace = {
          "none": 0,
          "browser": GL_BROWSER_DEFAULT_WEBGL
        };
        var textureTypes = {
          "uint8": GL_UNSIGNED_BYTE$5,
          "rgba4": GL_UNSIGNED_SHORT_4_4_4_4$1,
          "rgb565": GL_UNSIGNED_SHORT_5_6_5$1,
          "rgb5 a1": GL_UNSIGNED_SHORT_5_5_5_1$1
        };
        var textureFormats = {
          "alpha": GL_ALPHA,
          "luminance": GL_LUMINANCE,
          "luminance alpha": GL_LUMINANCE_ALPHA,
          "rgb": GL_RGB,
          "rgba": GL_RGBA$1,
          "rgba4": GL_RGBA4,
          "rgb5 a1": GL_RGB5_A1,
          "rgb565": GL_RGB565
        };
        var compressedTextureFormats = {};
        if (extensions.ext_srgb) {
          textureFormats.srgb = GL_SRGB_EXT;
          textureFormats.srgba = GL_SRGB_ALPHA_EXT;
        }
        if (extensions.oes_texture_float) {
          textureTypes.float32 = textureTypes.float = GL_FLOAT$4;
        }
        if (extensions.oes_texture_half_float) {
          textureTypes["float16"] = textureTypes["half float"] = GL_HALF_FLOAT_OES$1;
        }
        if (extensions.webgl_depth_texture) {
          extend(textureFormats, {
            "depth": GL_DEPTH_COMPONENT,
            "depth stencil": GL_DEPTH_STENCIL
          });
          extend(textureTypes, {
            "uint16": GL_UNSIGNED_SHORT$3,
            "uint32": GL_UNSIGNED_INT$3,
            "depth stencil": GL_UNSIGNED_INT_24_8_WEBGL$1
          });
        }
        if (extensions.webgl_compressed_texture_s3tc) {
          extend(compressedTextureFormats, {
            "rgb s3tc dxt1": GL_COMPRESSED_RGB_S3TC_DXT1_EXT,
            "rgba s3tc dxt1": GL_COMPRESSED_RGBA_S3TC_DXT1_EXT,
            "rgba s3tc dxt3": GL_COMPRESSED_RGBA_S3TC_DXT3_EXT,
            "rgba s3tc dxt5": GL_COMPRESSED_RGBA_S3TC_DXT5_EXT
          });
        }
        if (extensions.webgl_compressed_texture_atc) {
          extend(compressedTextureFormats, {
            "rgb atc": GL_COMPRESSED_RGB_ATC_WEBGL,
            "rgba atc explicit alpha": GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
            "rgba atc interpolated alpha": GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
          });
        }
        if (extensions.webgl_compressed_texture_pvrtc) {
          extend(compressedTextureFormats, {
            "rgb pvrtc 4bppv1": GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
            "rgb pvrtc 2bppv1": GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
            "rgba pvrtc 4bppv1": GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
            "rgba pvrtc 2bppv1": GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
          });
        }
        if (extensions.webgl_compressed_texture_etc1) {
          compressedTextureFormats["rgb etc1"] = GL_COMPRESSED_RGB_ETC1_WEBGL;
        }
        var supportedCompressedFormats = Array.prototype.slice.call(gl.getParameter(GL_COMPRESSED_TEXTURE_FORMATS));
        Object.keys(compressedTextureFormats).forEach(function(name) {
          var format2 = compressedTextureFormats[name];
          if (supportedCompressedFormats.indexOf(format2) >= 0) {
            textureFormats[name] = format2;
          }
        });
        var supportedFormats = Object.keys(textureFormats);
        limits.textureFormats = supportedFormats;
        var textureFormatsInvert = [];
        Object.keys(textureFormats).forEach(function(key) {
          var val = textureFormats[key];
          textureFormatsInvert[val] = key;
        });
        var textureTypesInvert = [];
        Object.keys(textureTypes).forEach(function(key) {
          var val = textureTypes[key];
          textureTypesInvert[val] = key;
        });
        var magFiltersInvert = [];
        Object.keys(magFilters).forEach(function(key) {
          var val = magFilters[key];
          magFiltersInvert[val] = key;
        });
        var minFiltersInvert = [];
        Object.keys(minFilters).forEach(function(key) {
          var val = minFilters[key];
          minFiltersInvert[val] = key;
        });
        var wrapModesInvert = [];
        Object.keys(wrapModes).forEach(function(key) {
          var val = wrapModes[key];
          wrapModesInvert[val] = key;
        });
        var colorFormats = supportedFormats.reduce(function(color, key) {
          var glenum = textureFormats[key];
          if (glenum === GL_LUMINANCE || glenum === GL_ALPHA || glenum === GL_LUMINANCE || glenum === GL_LUMINANCE_ALPHA || glenum === GL_DEPTH_COMPONENT || glenum === GL_DEPTH_STENCIL || extensions.ext_srgb && (glenum === GL_SRGB_EXT || glenum === GL_SRGB_ALPHA_EXT)) {
            color[glenum] = glenum;
          } else if (glenum === GL_RGB5_A1 || key.indexOf("rgba") >= 0) {
            color[glenum] = GL_RGBA$1;
          } else {
            color[glenum] = GL_RGB;
          }
          return color;
        }, {});
        function TexFlags() {
          this.internalformat = GL_RGBA$1;
          this.format = GL_RGBA$1;
          this.type = GL_UNSIGNED_BYTE$5;
          this.compressed = false;
          this.premultiplyAlpha = false;
          this.flipY = false;
          this.unpackAlignment = 1;
          this.colorSpace = GL_BROWSER_DEFAULT_WEBGL;
          this.width = 0;
          this.height = 0;
          this.channels = 0;
        }
        function copyFlags(result, other) {
          result.internalformat = other.internalformat;
          result.format = other.format;
          result.type = other.type;
          result.compressed = other.compressed;
          result.premultiplyAlpha = other.premultiplyAlpha;
          result.flipY = other.flipY;
          result.unpackAlignment = other.unpackAlignment;
          result.colorSpace = other.colorSpace;
          result.width = other.width;
          result.height = other.height;
          result.channels = other.channels;
        }
        function parseFlags(flags, options2) {
          if (typeof options2 !== "object" || !options2) {
            return;
          }
          if ("premultiplyAlpha" in options2) {
            check$1.type(options2.premultiplyAlpha, "boolean", "invalid premultiplyAlpha");
            flags.premultiplyAlpha = options2.premultiplyAlpha;
          }
          if ("flipY" in options2) {
            check$1.type(options2.flipY, "boolean", "invalid texture flip");
            flags.flipY = options2.flipY;
          }
          if ("alignment" in options2) {
            check$1.oneOf(options2.alignment, [1, 2, 4, 8], "invalid texture unpack alignment");
            flags.unpackAlignment = options2.alignment;
          }
          if ("colorSpace" in options2) {
            check$1.parameter(options2.colorSpace, colorSpace, "invalid colorSpace");
            flags.colorSpace = colorSpace[options2.colorSpace];
          }
          if ("type" in options2) {
            var type = options2.type;
            check$1(extensions.oes_texture_float || !(type === "float" || type === "float32"), "you must enable the OES_texture_float extension in order to use floating point textures.");
            check$1(extensions.oes_texture_half_float || !(type === "half float" || type === "float16"), "you must enable the OES_texture_half_float extension in order to use 16-bit floating point textures.");
            check$1(extensions.webgl_depth_texture || !(type === "uint16" || type === "uint32" || type === "depth stencil"), "you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.");
            check$1.parameter(type, textureTypes, "invalid texture type");
            flags.type = textureTypes[type];
          }
          var w = flags.width;
          var h = flags.height;
          var c = flags.channels;
          var hasChannels = false;
          if ("shape" in options2) {
            check$1(Array.isArray(options2.shape) && options2.shape.length >= 2, "shape must be an array");
            w = options2.shape[0];
            h = options2.shape[1];
            if (options2.shape.length === 3) {
              c = options2.shape[2];
              check$1(c > 0 && c <= 4, "invalid number of channels");
              hasChannels = true;
            }
            check$1(w >= 0 && w <= limits.maxTextureSize, "invalid width");
            check$1(h >= 0 && h <= limits.maxTextureSize, "invalid height");
          } else {
            if ("radius" in options2) {
              w = h = options2.radius;
              check$1(w >= 0 && w <= limits.maxTextureSize, "invalid radius");
            }
            if ("width" in options2) {
              w = options2.width;
              check$1(w >= 0 && w <= limits.maxTextureSize, "invalid width");
            }
            if ("height" in options2) {
              h = options2.height;
              check$1(h >= 0 && h <= limits.maxTextureSize, "invalid height");
            }
            if ("channels" in options2) {
              c = options2.channels;
              check$1(c > 0 && c <= 4, "invalid number of channels");
              hasChannels = true;
            }
          }
          flags.width = w | 0;
          flags.height = h | 0;
          flags.channels = c | 0;
          var hasFormat = false;
          if ("format" in options2) {
            var formatStr = options2.format;
            check$1(extensions.webgl_depth_texture || !(formatStr === "depth" || formatStr === "depth stencil"), "you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.");
            check$1.parameter(formatStr, textureFormats, "invalid texture format");
            var internalformat = flags.internalformat = textureFormats[formatStr];
            flags.format = colorFormats[internalformat];
            if (formatStr in textureTypes) {
              if (!("type" in options2)) {
                flags.type = textureTypes[formatStr];
              }
            }
            if (formatStr in compressedTextureFormats) {
              flags.compressed = true;
            }
            hasFormat = true;
          }
          if (!hasChannels && hasFormat) {
            flags.channels = FORMAT_CHANNELS[flags.format];
          } else if (hasChannels && !hasFormat) {
            if (flags.channels !== CHANNELS_FORMAT[flags.format]) {
              flags.format = flags.internalformat = CHANNELS_FORMAT[flags.channels];
            }
          } else if (hasFormat && hasChannels) {
            check$1(flags.channels === FORMAT_CHANNELS[flags.format], "number of channels inconsistent with specified format");
          }
        }
        function setFlags(flags) {
          gl.pixelStorei(GL_UNPACK_FLIP_Y_WEBGL, flags.flipY);
          gl.pixelStorei(GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, flags.premultiplyAlpha);
          gl.pixelStorei(GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, flags.colorSpace);
          gl.pixelStorei(GL_UNPACK_ALIGNMENT, flags.unpackAlignment);
        }
        function TexImage() {
          TexFlags.call(this);
          this.xOffset = 0;
          this.yOffset = 0;
          this.data = null;
          this.needsFree = false;
          this.element = null;
          this.needsCopy = false;
        }
        function parseImage(image, options2) {
          var data2 = null;
          if (isPixelData(options2)) {
            data2 = options2;
          } else if (options2) {
            check$1.type(options2, "object", "invalid pixel data type");
            parseFlags(image, options2);
            if ("x" in options2) {
              image.xOffset = options2.x | 0;
            }
            if ("y" in options2) {
              image.yOffset = options2.y | 0;
            }
            if (isPixelData(options2.data)) {
              data2 = options2.data;
            }
          }
          check$1(!image.compressed || data2 instanceof Uint8Array, "compressed texture data must be stored in a uint8array");
          if (options2.copy) {
            check$1(!data2, "can not specify copy and data field for the same texture");
            var viewW = contextState.viewportWidth;
            var viewH = contextState.viewportHeight;
            image.width = image.width || viewW - image.xOffset;
            image.height = image.height || viewH - image.yOffset;
            image.needsCopy = true;
            check$1(image.xOffset >= 0 && image.xOffset < viewW && image.yOffset >= 0 && image.yOffset < viewH && image.width > 0 && image.width <= viewW && image.height > 0 && image.height <= viewH, "copy texture read out of bounds");
          } else if (!data2) {
            image.width = image.width || 1;
            image.height = image.height || 1;
            image.channels = image.channels || 4;
          } else if (isTypedArray(data2)) {
            image.channels = image.channels || 4;
            image.data = data2;
            if (!("type" in options2) && image.type === GL_UNSIGNED_BYTE$5) {
              image.type = typedArrayCode$1(data2);
            }
          } else if (isNumericArray(data2)) {
            image.channels = image.channels || 4;
            convertData(image, data2);
            image.alignment = 1;
            image.needsFree = true;
          } else if (isNDArrayLike(data2)) {
            var array = data2.data;
            if (!Array.isArray(array) && image.type === GL_UNSIGNED_BYTE$5) {
              image.type = typedArrayCode$1(array);
            }
            var shape = data2.shape;
            var stride = data2.stride;
            var shapeX, shapeY, shapeC, strideX, strideY, strideC;
            if (shape.length === 3) {
              shapeC = shape[2];
              strideC = stride[2];
            } else {
              check$1(shape.length === 2, "invalid ndarray pixel data, must be 2 or 3D");
              shapeC = 1;
              strideC = 1;
            }
            shapeX = shape[0];
            shapeY = shape[1];
            strideX = stride[0];
            strideY = stride[1];
            image.alignment = 1;
            image.width = shapeX;
            image.height = shapeY;
            image.channels = shapeC;
            image.format = image.internalformat = CHANNELS_FORMAT[shapeC];
            image.needsFree = true;
            transposeData(image, array, strideX, strideY, strideC, data2.offset);
          } else if (isCanvasElement(data2) || isOffscreenCanvas(data2) || isContext2D(data2)) {
            if (isCanvasElement(data2) || isOffscreenCanvas(data2)) {
              image.element = data2;
            } else {
              image.element = data2.canvas;
            }
            image.width = image.element.width;
            image.height = image.element.height;
            image.channels = 4;
          } else if (isBitmap(data2)) {
            image.element = data2;
            image.width = data2.width;
            image.height = data2.height;
            image.channels = 4;
          } else if (isImageElement(data2)) {
            image.element = data2;
            image.width = data2.naturalWidth;
            image.height = data2.naturalHeight;
            image.channels = 4;
          } else if (isVideoElement(data2)) {
            image.element = data2;
            image.width = data2.videoWidth;
            image.height = data2.videoHeight;
            image.channels = 4;
          } else if (isRectArray(data2)) {
            var w = image.width || data2[0].length;
            var h = image.height || data2.length;
            var c = image.channels;
            if (isArrayLike(data2[0][0])) {
              c = c || data2[0][0].length;
            } else {
              c = c || 1;
            }
            var arrayShape2 = flattenUtils.shape(data2);
            var n = 1;
            for (var dd = 0; dd < arrayShape2.length; ++dd) {
              n *= arrayShape2[dd];
            }
            var allocData = preConvert(image, n);
            flattenUtils.flatten(data2, arrayShape2, "", allocData);
            postConvert(image, allocData);
            image.alignment = 1;
            image.width = w;
            image.height = h;
            image.channels = c;
            image.format = image.internalformat = CHANNELS_FORMAT[c];
            image.needsFree = true;
          }
          if (image.type === GL_FLOAT$4) {
            check$1(limits.extensions.indexOf("oes_texture_float") >= 0, "oes_texture_float extension not enabled");
          } else if (image.type === GL_HALF_FLOAT_OES$1) {
            check$1(limits.extensions.indexOf("oes_texture_half_float") >= 0, "oes_texture_half_float extension not enabled");
          }
        }
        function setImage(info, target, miplevel) {
          var element = info.element;
          var data2 = info.data;
          var internalformat = info.internalformat;
          var format2 = info.format;
          var type = info.type;
          var width = info.width;
          var height = info.height;
          setFlags(info);
          if (element) {
            gl.texImage2D(target, miplevel, format2, format2, type, element);
          } else if (info.compressed) {
            gl.compressedTexImage2D(target, miplevel, internalformat, width, height, 0, data2);
          } else if (info.needsCopy) {
            reglPoll();
            gl.copyTexImage2D(target, miplevel, format2, info.xOffset, info.yOffset, width, height, 0);
          } else {
            gl.texImage2D(target, miplevel, format2, width, height, 0, format2, type, data2 || null);
          }
        }
        function setSubImage(info, target, x, y, miplevel) {
          var element = info.element;
          var data2 = info.data;
          var internalformat = info.internalformat;
          var format2 = info.format;
          var type = info.type;
          var width = info.width;
          var height = info.height;
          setFlags(info);
          if (element) {
            gl.texSubImage2D(target, miplevel, x, y, format2, type, element);
          } else if (info.compressed) {
            gl.compressedTexSubImage2D(target, miplevel, x, y, internalformat, width, height, data2);
          } else if (info.needsCopy) {
            reglPoll();
            gl.copyTexSubImage2D(target, miplevel, x, y, info.xOffset, info.yOffset, width, height);
          } else {
            gl.texSubImage2D(target, miplevel, x, y, width, height, format2, type, data2);
          }
        }
        var imagePool = [];
        function allocImage() {
          return imagePool.pop() || new TexImage();
        }
        function freeImage(image) {
          if (image.needsFree) {
            pool.freeType(image.data);
          }
          TexImage.call(image);
          imagePool.push(image);
        }
        function MipMap() {
          TexFlags.call(this);
          this.genMipmaps = false;
          this.mipmapHint = GL_DONT_CARE;
          this.mipmask = 0;
          this.images = Array(16);
        }
        function parseMipMapFromShape(mipmap, width, height) {
          var img = mipmap.images[0] = allocImage();
          mipmap.mipmask = 1;
          img.width = mipmap.width = width;
          img.height = mipmap.height = height;
          img.channels = mipmap.channels = 4;
        }
        function parseMipMapFromObject(mipmap, options2) {
          var imgData = null;
          if (isPixelData(options2)) {
            imgData = mipmap.images[0] = allocImage();
            copyFlags(imgData, mipmap);
            parseImage(imgData, options2);
            mipmap.mipmask = 1;
          } else {
            parseFlags(mipmap, options2);
            if (Array.isArray(options2.mipmap)) {
              var mipData = options2.mipmap;
              for (var i = 0; i < mipData.length; ++i) {
                imgData = mipmap.images[i] = allocImage();
                copyFlags(imgData, mipmap);
                imgData.width >>= i;
                imgData.height >>= i;
                parseImage(imgData, mipData[i]);
                mipmap.mipmask |= 1 << i;
              }
            } else {
              imgData = mipmap.images[0] = allocImage();
              copyFlags(imgData, mipmap);
              parseImage(imgData, options2);
              mipmap.mipmask = 1;
            }
          }
          copyFlags(mipmap, mipmap.images[0]);
          if (mipmap.compressed && (mipmap.internalformat === GL_COMPRESSED_RGB_S3TC_DXT1_EXT || mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT1_EXT || mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT3_EXT || mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT5_EXT)) {
            check$1(mipmap.width % 4 === 0 && mipmap.height % 4 === 0, "for compressed texture formats, mipmap level 0 must have width and height that are a multiple of 4");
          }
        }
        function setMipMap(mipmap, target) {
          var images = mipmap.images;
          for (var i = 0; i < images.length; ++i) {
            if (!images[i]) {
              return;
            }
            setImage(images[i], target, i);
          }
        }
        var mipPool = [];
        function allocMipMap() {
          var result = mipPool.pop() || new MipMap();
          TexFlags.call(result);
          result.mipmask = 0;
          for (var i = 0; i < 16; ++i) {
            result.images[i] = null;
          }
          return result;
        }
        function freeMipMap(mipmap) {
          var images = mipmap.images;
          for (var i = 0; i < images.length; ++i) {
            if (images[i]) {
              freeImage(images[i]);
            }
            images[i] = null;
          }
          mipPool.push(mipmap);
        }
        function TexInfo() {
          this.minFilter = GL_NEAREST$1;
          this.magFilter = GL_NEAREST$1;
          this.wrapS = GL_CLAMP_TO_EDGE$1;
          this.wrapT = GL_CLAMP_TO_EDGE$1;
          this.anisotropic = 1;
          this.genMipmaps = false;
          this.mipmapHint = GL_DONT_CARE;
        }
        function parseTexInfo(info, options2) {
          if ("min" in options2) {
            var minFilter = options2.min;
            check$1.parameter(minFilter, minFilters);
            info.minFilter = minFilters[minFilter];
            if (MIPMAP_FILTERS.indexOf(info.minFilter) >= 0 && !("faces" in options2)) {
              info.genMipmaps = true;
            }
          }
          if ("mag" in options2) {
            var magFilter = options2.mag;
            check$1.parameter(magFilter, magFilters);
            info.magFilter = magFilters[magFilter];
          }
          var wrapS = info.wrapS;
          var wrapT = info.wrapT;
          if ("wrap" in options2) {
            var wrap = options2.wrap;
            if (typeof wrap === "string") {
              check$1.parameter(wrap, wrapModes);
              wrapS = wrapT = wrapModes[wrap];
            } else if (Array.isArray(wrap)) {
              check$1.parameter(wrap[0], wrapModes);
              check$1.parameter(wrap[1], wrapModes);
              wrapS = wrapModes[wrap[0]];
              wrapT = wrapModes[wrap[1]];
            }
          } else {
            if ("wrapS" in options2) {
              var optWrapS = options2.wrapS;
              check$1.parameter(optWrapS, wrapModes);
              wrapS = wrapModes[optWrapS];
            }
            if ("wrapT" in options2) {
              var optWrapT = options2.wrapT;
              check$1.parameter(optWrapT, wrapModes);
              wrapT = wrapModes[optWrapT];
            }
          }
          info.wrapS = wrapS;
          info.wrapT = wrapT;
          if ("anisotropic" in options2) {
            var anisotropic = options2.anisotropic;
            check$1(typeof anisotropic === "number" && anisotropic >= 1 && anisotropic <= limits.maxAnisotropic, "aniso samples must be between 1 and ");
            info.anisotropic = options2.anisotropic;
          }
          if ("mipmap" in options2) {
            var hasMipMap = false;
            switch (typeof options2.mipmap) {
              case "string":
                check$1.parameter(options2.mipmap, mipmapHint, "invalid mipmap hint");
                info.mipmapHint = mipmapHint[options2.mipmap];
                info.genMipmaps = true;
                hasMipMap = true;
                break;
              case "boolean":
                hasMipMap = info.genMipmaps = options2.mipmap;
                break;
              case "object":
                check$1(Array.isArray(options2.mipmap), "invalid mipmap type");
                info.genMipmaps = false;
                hasMipMap = true;
                break;
              default:
                check$1.raise("invalid mipmap type");
            }
            if (hasMipMap && !("min" in options2)) {
              info.minFilter = GL_NEAREST_MIPMAP_NEAREST$1;
            }
          }
        }
        function setTexInfo(info, target) {
          gl.texParameteri(target, GL_TEXTURE_MIN_FILTER, info.minFilter);
          gl.texParameteri(target, GL_TEXTURE_MAG_FILTER, info.magFilter);
          gl.texParameteri(target, GL_TEXTURE_WRAP_S, info.wrapS);
          gl.texParameteri(target, GL_TEXTURE_WRAP_T, info.wrapT);
          if (extensions.ext_texture_filter_anisotropic) {
            gl.texParameteri(target, GL_TEXTURE_MAX_ANISOTROPY_EXT, info.anisotropic);
          }
          if (info.genMipmaps) {
            gl.hint(GL_GENERATE_MIPMAP_HINT, info.mipmapHint);
            gl.generateMipmap(target);
          }
        }
        var textureCount = 0;
        var textureSet = {};
        var numTexUnits = limits.maxTextureUnits;
        var textureUnits = Array(numTexUnits).map(function() {
          return null;
        });
        function REGLTexture(target) {
          TexFlags.call(this);
          this.mipmask = 0;
          this.internalformat = GL_RGBA$1;
          this.id = textureCount++;
          this.refCount = 1;
          this.target = target;
          this.texture = gl.createTexture();
          this.unit = -1;
          this.bindCount = 0;
          this.texInfo = new TexInfo();
          if (config.profile) {
            this.stats = { size: 0 };
          }
        }
        function tempBind(texture) {
          gl.activeTexture(GL_TEXTURE0$1);
          gl.bindTexture(texture.target, texture.texture);
        }
        function tempRestore() {
          var prev = textureUnits[0];
          if (prev) {
            gl.bindTexture(prev.target, prev.texture);
          } else {
            gl.bindTexture(GL_TEXTURE_2D$1, null);
          }
        }
        function destroy(texture) {
          var handle = texture.texture;
          check$1(handle, "must not double destroy texture");
          var unit = texture.unit;
          var target = texture.target;
          if (unit >= 0) {
            gl.activeTexture(GL_TEXTURE0$1 + unit);
            gl.bindTexture(target, null);
            textureUnits[unit] = null;
          }
          gl.deleteTexture(handle);
          texture.texture = null;
          texture.params = null;
          texture.pixels = null;
          texture.refCount = 0;
          delete textureSet[texture.id];
          stats2.textureCount--;
        }
        extend(REGLTexture.prototype, {
          bind: function() {
            var texture = this;
            texture.bindCount += 1;
            var unit = texture.unit;
            if (unit < 0) {
              for (var i = 0; i < numTexUnits; ++i) {
                var other = textureUnits[i];
                if (other) {
                  if (other.bindCount > 0) {
                    continue;
                  }
                  other.unit = -1;
                }
                textureUnits[i] = texture;
                unit = i;
                break;
              }
              if (unit >= numTexUnits) {
                check$1.raise("insufficient number of texture units");
              }
              if (config.profile && stats2.maxTextureUnits < unit + 1) {
                stats2.maxTextureUnits = unit + 1;
              }
              texture.unit = unit;
              gl.activeTexture(GL_TEXTURE0$1 + unit);
              gl.bindTexture(texture.target, texture.texture);
            }
            return unit;
          },
          unbind: function() {
            this.bindCount -= 1;
          },
          decRef: function() {
            if (--this.refCount <= 0) {
              destroy(this);
            }
          }
        });
        function createTexture2D(a, b) {
          var texture = new REGLTexture(GL_TEXTURE_2D$1);
          textureSet[texture.id] = texture;
          stats2.textureCount++;
          function reglTexture2D(a2, b2) {
            var texInfo = texture.texInfo;
            TexInfo.call(texInfo);
            var mipData = allocMipMap();
            if (typeof a2 === "number") {
              if (typeof b2 === "number") {
                parseMipMapFromShape(mipData, a2 | 0, b2 | 0);
              } else {
                parseMipMapFromShape(mipData, a2 | 0, a2 | 0);
              }
            } else if (a2) {
              check$1.type(a2, "object", "invalid arguments to regl.texture");
              parseTexInfo(texInfo, a2);
              parseMipMapFromObject(mipData, a2);
            } else {
              parseMipMapFromShape(mipData, 1, 1);
            }
            if (texInfo.genMipmaps) {
              mipData.mipmask = (mipData.width << 1) - 1;
            }
            texture.mipmask = mipData.mipmask;
            copyFlags(texture, mipData);
            check$1.texture2D(texInfo, mipData, limits);
            texture.internalformat = mipData.internalformat;
            reglTexture2D.width = mipData.width;
            reglTexture2D.height = mipData.height;
            tempBind(texture);
            setMipMap(mipData, GL_TEXTURE_2D$1);
            setTexInfo(texInfo, GL_TEXTURE_2D$1);
            tempRestore();
            freeMipMap(mipData);
            if (config.profile) {
              texture.stats.size = getTextureSize(texture.internalformat, texture.type, mipData.width, mipData.height, texInfo.genMipmaps, false);
            }
            reglTexture2D.format = textureFormatsInvert[texture.internalformat];
            reglTexture2D.type = textureTypesInvert[texture.type];
            reglTexture2D.mag = magFiltersInvert[texInfo.magFilter];
            reglTexture2D.min = minFiltersInvert[texInfo.minFilter];
            reglTexture2D.wrapS = wrapModesInvert[texInfo.wrapS];
            reglTexture2D.wrapT = wrapModesInvert[texInfo.wrapT];
            return reglTexture2D;
          }
          function subimage(image, x_, y_, level_) {
            check$1(!!image, "must specify image data");
            var x = x_ | 0;
            var y = y_ | 0;
            var level = level_ | 0;
            var imageData = allocImage();
            copyFlags(imageData, texture);
            imageData.width = 0;
            imageData.height = 0;
            parseImage(imageData, image);
            imageData.width = imageData.width || (texture.width >> level) - x;
            imageData.height = imageData.height || (texture.height >> level) - y;
            check$1(texture.type === imageData.type && texture.format === imageData.format && texture.internalformat === imageData.internalformat, "incompatible format for texture.subimage");
            check$1(x >= 0 && y >= 0 && x + imageData.width <= texture.width && y + imageData.height <= texture.height, "texture.subimage write out of bounds");
            check$1(texture.mipmask & 1 << level, "missing mipmap data");
            check$1(imageData.data || imageData.element || imageData.needsCopy, "missing image data");
            tempBind(texture);
            setSubImage(imageData, GL_TEXTURE_2D$1, x, y, level);
            tempRestore();
            freeImage(imageData);
            return reglTexture2D;
          }
          function resize(w_, h_) {
            var w = w_ | 0;
            var h = h_ | 0 || w;
            if (w === texture.width && h === texture.height) {
              return reglTexture2D;
            }
            reglTexture2D.width = texture.width = w;
            reglTexture2D.height = texture.height = h;
            tempBind(texture);
            for (var i = 0; texture.mipmask >> i; ++i) {
              var _w = w >> i;
              var _h = h >> i;
              if (!_w || !_h)
                break;
              gl.texImage2D(GL_TEXTURE_2D$1, i, texture.format, _w, _h, 0, texture.format, texture.type, null);
            }
            tempRestore();
            if (config.profile) {
              texture.stats.size = getTextureSize(texture.internalformat, texture.type, w, h, false, false);
            }
            return reglTexture2D;
          }
          reglTexture2D(a, b);
          reglTexture2D.subimage = subimage;
          reglTexture2D.resize = resize;
          reglTexture2D._reglType = "texture2d";
          reglTexture2D._texture = texture;
          if (config.profile) {
            reglTexture2D.stats = texture.stats;
          }
          reglTexture2D.destroy = function() {
            texture.decRef();
          };
          return reglTexture2D;
        }
        function createTextureCube(a0, a1, a2, a3, a4, a5) {
          var texture = new REGLTexture(GL_TEXTURE_CUBE_MAP$1);
          textureSet[texture.id] = texture;
          stats2.cubeCount++;
          var faces = new Array(6);
          function reglTextureCube(a02, a12, a22, a32, a42, a52) {
            var i;
            var texInfo = texture.texInfo;
            TexInfo.call(texInfo);
            for (i = 0; i < 6; ++i) {
              faces[i] = allocMipMap();
            }
            if (typeof a02 === "number" || !a02) {
              var s2 = a02 | 0 || 1;
              for (i = 0; i < 6; ++i) {
                parseMipMapFromShape(faces[i], s2, s2);
              }
            } else if (typeof a02 === "object") {
              if (a12) {
                parseMipMapFromObject(faces[0], a02);
                parseMipMapFromObject(faces[1], a12);
                parseMipMapFromObject(faces[2], a22);
                parseMipMapFromObject(faces[3], a32);
                parseMipMapFromObject(faces[4], a42);
                parseMipMapFromObject(faces[5], a52);
              } else {
                parseTexInfo(texInfo, a02);
                parseFlags(texture, a02);
                if ("faces" in a02) {
                  var faceInput = a02.faces;
                  check$1(Array.isArray(faceInput) && faceInput.length === 6, "cube faces must be a length 6 array");
                  for (i = 0; i < 6; ++i) {
                    check$1(typeof faceInput[i] === "object" && !!faceInput[i], "invalid input for cube map face");
                    copyFlags(faces[i], texture);
                    parseMipMapFromObject(faces[i], faceInput[i]);
                  }
                } else {
                  for (i = 0; i < 6; ++i) {
                    parseMipMapFromObject(faces[i], a02);
                  }
                }
              }
            } else {
              check$1.raise("invalid arguments to cube map");
            }
            copyFlags(texture, faces[0]);
            check$1.optional(function() {
              if (!limits.npotTextureCube) {
                check$1(isPow2$1(texture.width) && isPow2$1(texture.height), "your browser does not support non power or two texture dimensions");
              }
            });
            if (texInfo.genMipmaps) {
              texture.mipmask = (faces[0].width << 1) - 1;
            } else {
              texture.mipmask = faces[0].mipmask;
            }
            check$1.textureCube(texture, texInfo, faces, limits);
            texture.internalformat = faces[0].internalformat;
            reglTextureCube.width = faces[0].width;
            reglTextureCube.height = faces[0].height;
            tempBind(texture);
            for (i = 0; i < 6; ++i) {
              setMipMap(faces[i], GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i);
            }
            setTexInfo(texInfo, GL_TEXTURE_CUBE_MAP$1);
            tempRestore();
            if (config.profile) {
              texture.stats.size = getTextureSize(texture.internalformat, texture.type, reglTextureCube.width, reglTextureCube.height, texInfo.genMipmaps, true);
            }
            reglTextureCube.format = textureFormatsInvert[texture.internalformat];
            reglTextureCube.type = textureTypesInvert[texture.type];
            reglTextureCube.mag = magFiltersInvert[texInfo.magFilter];
            reglTextureCube.min = minFiltersInvert[texInfo.minFilter];
            reglTextureCube.wrapS = wrapModesInvert[texInfo.wrapS];
            reglTextureCube.wrapT = wrapModesInvert[texInfo.wrapT];
            for (i = 0; i < 6; ++i) {
              freeMipMap(faces[i]);
            }
            return reglTextureCube;
          }
          function subimage(face, image, x_, y_, level_) {
            check$1(!!image, "must specify image data");
            check$1(typeof face === "number" && face === (face | 0) && face >= 0 && face < 6, "invalid face");
            var x = x_ | 0;
            var y = y_ | 0;
            var level = level_ | 0;
            var imageData = allocImage();
            copyFlags(imageData, texture);
            imageData.width = 0;
            imageData.height = 0;
            parseImage(imageData, image);
            imageData.width = imageData.width || (texture.width >> level) - x;
            imageData.height = imageData.height || (texture.height >> level) - y;
            check$1(texture.type === imageData.type && texture.format === imageData.format && texture.internalformat === imageData.internalformat, "incompatible format for texture.subimage");
            check$1(x >= 0 && y >= 0 && x + imageData.width <= texture.width && y + imageData.height <= texture.height, "texture.subimage write out of bounds");
            check$1(texture.mipmask & 1 << level, "missing mipmap data");
            check$1(imageData.data || imageData.element || imageData.needsCopy, "missing image data");
            tempBind(texture);
            setSubImage(imageData, GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + face, x, y, level);
            tempRestore();
            freeImage(imageData);
            return reglTextureCube;
          }
          function resize(radius_) {
            var radius = radius_ | 0;
            if (radius === texture.width) {
              return;
            }
            reglTextureCube.width = texture.width = radius;
            reglTextureCube.height = texture.height = radius;
            tempBind(texture);
            for (var i = 0; i < 6; ++i) {
              for (var j = 0; texture.mipmask >> j; ++j) {
                gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i, j, texture.format, radius >> j, radius >> j, 0, texture.format, texture.type, null);
              }
            }
            tempRestore();
            if (config.profile) {
              texture.stats.size = getTextureSize(texture.internalformat, texture.type, reglTextureCube.width, reglTextureCube.height, false, true);
            }
            return reglTextureCube;
          }
          reglTextureCube(a0, a1, a2, a3, a4, a5);
          reglTextureCube.subimage = subimage;
          reglTextureCube.resize = resize;
          reglTextureCube._reglType = "textureCube";
          reglTextureCube._texture = texture;
          if (config.profile) {
            reglTextureCube.stats = texture.stats;
          }
          reglTextureCube.destroy = function() {
            texture.decRef();
          };
          return reglTextureCube;
        }
        function destroyTextures() {
          for (var i = 0; i < numTexUnits; ++i) {
            gl.activeTexture(GL_TEXTURE0$1 + i);
            gl.bindTexture(GL_TEXTURE_2D$1, null);
            textureUnits[i] = null;
          }
          values(textureSet).forEach(destroy);
          stats2.cubeCount = 0;
          stats2.textureCount = 0;
        }
        if (config.profile) {
          stats2.getTotalTextureSize = function() {
            var total = 0;
            Object.keys(textureSet).forEach(function(key) {
              total += textureSet[key].stats.size;
            });
            return total;
          };
        }
        function restoreTextures() {
          for (var i = 0; i < numTexUnits; ++i) {
            var tex = textureUnits[i];
            if (tex) {
              tex.bindCount = 0;
              tex.unit = -1;
              textureUnits[i] = null;
            }
          }
          values(textureSet).forEach(function(texture) {
            texture.texture = gl.createTexture();
            gl.bindTexture(texture.target, texture.texture);
            for (var i2 = 0; i2 < 32; ++i2) {
              if ((texture.mipmask & 1 << i2) === 0) {
                continue;
              }
              if (texture.target === GL_TEXTURE_2D$1) {
                gl.texImage2D(GL_TEXTURE_2D$1, i2, texture.internalformat, texture.width >> i2, texture.height >> i2, 0, texture.internalformat, texture.type, null);
              } else {
                for (var j = 0; j < 6; ++j) {
                  gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + j, i2, texture.internalformat, texture.width >> i2, texture.height >> i2, 0, texture.internalformat, texture.type, null);
                }
              }
            }
            setTexInfo(texture.texInfo, texture.target);
          });
        }
        function refreshTextures() {
          for (var i = 0; i < numTexUnits; ++i) {
            var tex = textureUnits[i];
            if (tex) {
              tex.bindCount = 0;
              tex.unit = -1;
              textureUnits[i] = null;
            }
            gl.activeTexture(GL_TEXTURE0$1 + i);
            gl.bindTexture(GL_TEXTURE_2D$1, null);
            gl.bindTexture(GL_TEXTURE_CUBE_MAP$1, null);
          }
        }
        return {
          create2D: createTexture2D,
          createCube: createTextureCube,
          clear: destroyTextures,
          getTexture: function(wrapper) {
            return null;
          },
          restore: restoreTextures,
          refresh: refreshTextures
        };
      }
      var GL_RENDERBUFFER = 36161;
      var GL_RGBA4$1 = 32854;
      var GL_RGB5_A1$1 = 32855;
      var GL_RGB565$1 = 36194;
      var GL_DEPTH_COMPONENT16 = 33189;
      var GL_STENCIL_INDEX8 = 36168;
      var GL_DEPTH_STENCIL$1 = 34041;
      var GL_SRGB8_ALPHA8_EXT = 35907;
      var GL_RGBA32F_EXT = 34836;
      var GL_RGBA16F_EXT = 34842;
      var GL_RGB16F_EXT = 34843;
      var FORMAT_SIZES = [];
      FORMAT_SIZES[GL_RGBA4$1] = 2;
      FORMAT_SIZES[GL_RGB5_A1$1] = 2;
      FORMAT_SIZES[GL_RGB565$1] = 2;
      FORMAT_SIZES[GL_DEPTH_COMPONENT16] = 2;
      FORMAT_SIZES[GL_STENCIL_INDEX8] = 1;
      FORMAT_SIZES[GL_DEPTH_STENCIL$1] = 4;
      FORMAT_SIZES[GL_SRGB8_ALPHA8_EXT] = 4;
      FORMAT_SIZES[GL_RGBA32F_EXT] = 16;
      FORMAT_SIZES[GL_RGBA16F_EXT] = 8;
      FORMAT_SIZES[GL_RGB16F_EXT] = 6;
      function getRenderbufferSize(format2, width, height) {
        return FORMAT_SIZES[format2] * width * height;
      }
      var wrapRenderbuffers = function(gl, extensions, limits, stats2, config) {
        var formatTypes = {
          "rgba4": GL_RGBA4$1,
          "rgb565": GL_RGB565$1,
          "rgb5 a1": GL_RGB5_A1$1,
          "depth": GL_DEPTH_COMPONENT16,
          "stencil": GL_STENCIL_INDEX8,
          "depth stencil": GL_DEPTH_STENCIL$1
        };
        if (extensions.ext_srgb) {
          formatTypes["srgba"] = GL_SRGB8_ALPHA8_EXT;
        }
        if (extensions.ext_color_buffer_half_float) {
          formatTypes["rgba16f"] = GL_RGBA16F_EXT;
          formatTypes["rgb16f"] = GL_RGB16F_EXT;
        }
        if (extensions.webgl_color_buffer_float) {
          formatTypes["rgba32f"] = GL_RGBA32F_EXT;
        }
        var formatTypesInvert = [];
        Object.keys(formatTypes).forEach(function(key) {
          var val = formatTypes[key];
          formatTypesInvert[val] = key;
        });
        var renderbufferCount = 0;
        var renderbufferSet = {};
        function REGLRenderbuffer(renderbuffer) {
          this.id = renderbufferCount++;
          this.refCount = 1;
          this.renderbuffer = renderbuffer;
          this.format = GL_RGBA4$1;
          this.width = 0;
          this.height = 0;
          if (config.profile) {
            this.stats = { size: 0 };
          }
        }
        REGLRenderbuffer.prototype.decRef = function() {
          if (--this.refCount <= 0) {
            destroy(this);
          }
        };
        function destroy(rb) {
          var handle = rb.renderbuffer;
          check$1(handle, "must not double destroy renderbuffer");
          gl.bindRenderbuffer(GL_RENDERBUFFER, null);
          gl.deleteRenderbuffer(handle);
          rb.renderbuffer = null;
          rb.refCount = 0;
          delete renderbufferSet[rb.id];
          stats2.renderbufferCount--;
        }
        function createRenderbuffer(a, b) {
          var renderbuffer = new REGLRenderbuffer(gl.createRenderbuffer());
          renderbufferSet[renderbuffer.id] = renderbuffer;
          stats2.renderbufferCount++;
          function reglRenderbuffer(a2, b2) {
            var w = 0;
            var h = 0;
            var format2 = GL_RGBA4$1;
            if (typeof a2 === "object" && a2) {
              var options2 = a2;
              if ("shape" in options2) {
                var shape = options2.shape;
                check$1(Array.isArray(shape) && shape.length >= 2, "invalid renderbuffer shape");
                w = shape[0] | 0;
                h = shape[1] | 0;
              } else {
                if ("radius" in options2) {
                  w = h = options2.radius | 0;
                }
                if ("width" in options2) {
                  w = options2.width | 0;
                }
                if ("height" in options2) {
                  h = options2.height | 0;
                }
              }
              if ("format" in options2) {
                check$1.parameter(options2.format, formatTypes, "invalid renderbuffer format");
                format2 = formatTypes[options2.format];
              }
            } else if (typeof a2 === "number") {
              w = a2 | 0;
              if (typeof b2 === "number") {
                h = b2 | 0;
              } else {
                h = w;
              }
            } else if (!a2) {
              w = h = 1;
            } else {
              check$1.raise("invalid arguments to renderbuffer constructor");
            }
            check$1(w > 0 && h > 0 && w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize, "invalid renderbuffer size");
            if (w === renderbuffer.width && h === renderbuffer.height && format2 === renderbuffer.format) {
              return;
            }
            reglRenderbuffer.width = renderbuffer.width = w;
            reglRenderbuffer.height = renderbuffer.height = h;
            renderbuffer.format = format2;
            gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
            gl.renderbufferStorage(GL_RENDERBUFFER, format2, w, h);
            check$1(gl.getError() === 0, "invalid render buffer format");
            if (config.profile) {
              renderbuffer.stats.size = getRenderbufferSize(renderbuffer.format, renderbuffer.width, renderbuffer.height);
            }
            reglRenderbuffer.format = formatTypesInvert[renderbuffer.format];
            return reglRenderbuffer;
          }
          function resize(w_, h_) {
            var w = w_ | 0;
            var h = h_ | 0 || w;
            if (w === renderbuffer.width && h === renderbuffer.height) {
              return reglRenderbuffer;
            }
            check$1(w > 0 && h > 0 && w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize, "invalid renderbuffer size");
            reglRenderbuffer.width = renderbuffer.width = w;
            reglRenderbuffer.height = renderbuffer.height = h;
            gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
            gl.renderbufferStorage(GL_RENDERBUFFER, renderbuffer.format, w, h);
            check$1(gl.getError() === 0, "invalid render buffer format");
            if (config.profile) {
              renderbuffer.stats.size = getRenderbufferSize(renderbuffer.format, renderbuffer.width, renderbuffer.height);
            }
            return reglRenderbuffer;
          }
          reglRenderbuffer(a, b);
          reglRenderbuffer.resize = resize;
          reglRenderbuffer._reglType = "renderbuffer";
          reglRenderbuffer._renderbuffer = renderbuffer;
          if (config.profile) {
            reglRenderbuffer.stats = renderbuffer.stats;
          }
          reglRenderbuffer.destroy = function() {
            renderbuffer.decRef();
          };
          return reglRenderbuffer;
        }
        if (config.profile) {
          stats2.getTotalRenderbufferSize = function() {
            var total = 0;
            Object.keys(renderbufferSet).forEach(function(key) {
              total += renderbufferSet[key].stats.size;
            });
            return total;
          };
        }
        function restoreRenderbuffers() {
          values(renderbufferSet).forEach(function(rb) {
            rb.renderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(GL_RENDERBUFFER, rb.renderbuffer);
            gl.renderbufferStorage(GL_RENDERBUFFER, rb.format, rb.width, rb.height);
          });
          gl.bindRenderbuffer(GL_RENDERBUFFER, null);
        }
        return {
          create: createRenderbuffer,
          clear: function() {
            values(renderbufferSet).forEach(destroy);
          },
          restore: restoreRenderbuffers
        };
      };
      var GL_FRAMEBUFFER$1 = 36160;
      var GL_RENDERBUFFER$1 = 36161;
      var GL_TEXTURE_2D$2 = 3553;
      var GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 = 34069;
      var GL_COLOR_ATTACHMENT0$1 = 36064;
      var GL_DEPTH_ATTACHMENT = 36096;
      var GL_STENCIL_ATTACHMENT = 36128;
      var GL_DEPTH_STENCIL_ATTACHMENT = 33306;
      var GL_FRAMEBUFFER_COMPLETE$1 = 36053;
      var GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054;
      var GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055;
      var GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057;
      var GL_FRAMEBUFFER_UNSUPPORTED = 36061;
      var GL_HALF_FLOAT_OES$2 = 36193;
      var GL_UNSIGNED_BYTE$6 = 5121;
      var GL_FLOAT$5 = 5126;
      var GL_RGB$1 = 6407;
      var GL_RGBA$2 = 6408;
      var GL_DEPTH_COMPONENT$1 = 6402;
      var colorTextureFormatEnums = [
        GL_RGB$1,
        GL_RGBA$2
      ];
      var textureFormatChannels = [];
      textureFormatChannels[GL_RGBA$2] = 4;
      textureFormatChannels[GL_RGB$1] = 3;
      var textureTypeSizes = [];
      textureTypeSizes[GL_UNSIGNED_BYTE$6] = 1;
      textureTypeSizes[GL_FLOAT$5] = 4;
      textureTypeSizes[GL_HALF_FLOAT_OES$2] = 2;
      var GL_RGBA4$2 = 32854;
      var GL_RGB5_A1$2 = 32855;
      var GL_RGB565$2 = 36194;
      var GL_DEPTH_COMPONENT16$1 = 33189;
      var GL_STENCIL_INDEX8$1 = 36168;
      var GL_DEPTH_STENCIL$2 = 34041;
      var GL_SRGB8_ALPHA8_EXT$1 = 35907;
      var GL_RGBA32F_EXT$1 = 34836;
      var GL_RGBA16F_EXT$1 = 34842;
      var GL_RGB16F_EXT$1 = 34843;
      var colorRenderbufferFormatEnums = [
        GL_RGBA4$2,
        GL_RGB5_A1$2,
        GL_RGB565$2,
        GL_SRGB8_ALPHA8_EXT$1,
        GL_RGBA16F_EXT$1,
        GL_RGB16F_EXT$1,
        GL_RGBA32F_EXT$1
      ];
      var statusCode = {};
      statusCode[GL_FRAMEBUFFER_COMPLETE$1] = "complete";
      statusCode[GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT] = "incomplete attachment";
      statusCode[GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS] = "incomplete dimensions";
      statusCode[GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT] = "incomplete, missing attachment";
      statusCode[GL_FRAMEBUFFER_UNSUPPORTED] = "unsupported";
      function wrapFBOState(gl, extensions, limits, textureState, renderbufferState, stats2) {
        var framebufferState = {
          cur: null,
          next: null,
          dirty: false,
          setFBO: null
        };
        var colorTextureFormats = ["rgba"];
        var colorRenderbufferFormats = ["rgba4", "rgb565", "rgb5 a1"];
        if (extensions.ext_srgb) {
          colorRenderbufferFormats.push("srgba");
        }
        if (extensions.ext_color_buffer_half_float) {
          colorRenderbufferFormats.push("rgba16f", "rgb16f");
        }
        if (extensions.webgl_color_buffer_float) {
          colorRenderbufferFormats.push("rgba32f");
        }
        var colorTypes = ["uint8"];
        if (extensions.oes_texture_half_float) {
          colorTypes.push("half float", "float16");
        }
        if (extensions.oes_texture_float) {
          colorTypes.push("float", "float32");
        }
        function FramebufferAttachment(target, texture, renderbuffer) {
          this.target = target;
          this.texture = texture;
          this.renderbuffer = renderbuffer;
          var w = 0;
          var h = 0;
          if (texture) {
            w = texture.width;
            h = texture.height;
          } else if (renderbuffer) {
            w = renderbuffer.width;
            h = renderbuffer.height;
          }
          this.width = w;
          this.height = h;
        }
        function decRef(attachment) {
          if (attachment) {
            if (attachment.texture) {
              attachment.texture._texture.decRef();
            }
            if (attachment.renderbuffer) {
              attachment.renderbuffer._renderbuffer.decRef();
            }
          }
        }
        function incRefAndCheckShape(attachment, width, height) {
          if (!attachment) {
            return;
          }
          if (attachment.texture) {
            var texture = attachment.texture._texture;
            var tw = Math.max(1, texture.width);
            var th = Math.max(1, texture.height);
            check$1(tw === width && th === height, "inconsistent width/height for supplied texture");
            texture.refCount += 1;
          } else {
            var renderbuffer = attachment.renderbuffer._renderbuffer;
            check$1(renderbuffer.width === width && renderbuffer.height === height, "inconsistent width/height for renderbuffer");
            renderbuffer.refCount += 1;
          }
        }
        function attach(location, attachment) {
          if (attachment) {
            if (attachment.texture) {
              gl.framebufferTexture2D(GL_FRAMEBUFFER$1, location, attachment.target, attachment.texture._texture.texture, 0);
            } else {
              gl.framebufferRenderbuffer(GL_FRAMEBUFFER$1, location, GL_RENDERBUFFER$1, attachment.renderbuffer._renderbuffer.renderbuffer);
            }
          }
        }
        function parseAttachment(attachment) {
          var target = GL_TEXTURE_2D$2;
          var texture = null;
          var renderbuffer = null;
          var data2 = attachment;
          if (typeof attachment === "object") {
            data2 = attachment.data;
            if ("target" in attachment) {
              target = attachment.target | 0;
            }
          }
          check$1.type(data2, "function", "invalid attachment data");
          var type = data2._reglType;
          if (type === "texture2d") {
            texture = data2;
            check$1(target === GL_TEXTURE_2D$2);
          } else if (type === "textureCube") {
            texture = data2;
            check$1(target >= GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 && target < GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 + 6, "invalid cube map target");
          } else if (type === "renderbuffer") {
            renderbuffer = data2;
            target = GL_RENDERBUFFER$1;
          } else {
            check$1.raise("invalid regl object for attachment");
          }
          return new FramebufferAttachment(target, texture, renderbuffer);
        }
        function allocAttachment(width, height, isTexture, format2, type) {
          if (isTexture) {
            var texture = textureState.create2D({
              width,
              height,
              format: format2,
              type
            });
            texture._texture.refCount = 0;
            return new FramebufferAttachment(GL_TEXTURE_2D$2, texture, null);
          } else {
            var rb = renderbufferState.create({
              width,
              height,
              format: format2
            });
            rb._renderbuffer.refCount = 0;
            return new FramebufferAttachment(GL_RENDERBUFFER$1, null, rb);
          }
        }
        function unwrapAttachment(attachment) {
          return attachment && (attachment.texture || attachment.renderbuffer);
        }
        function resizeAttachment(attachment, w, h) {
          if (attachment) {
            if (attachment.texture) {
              attachment.texture.resize(w, h);
            } else if (attachment.renderbuffer) {
              attachment.renderbuffer.resize(w, h);
            }
            attachment.width = w;
            attachment.height = h;
          }
        }
        var framebufferCount = 0;
        var framebufferSet = {};
        function REGLFramebuffer() {
          this.id = framebufferCount++;
          framebufferSet[this.id] = this;
          this.framebuffer = gl.createFramebuffer();
          this.width = 0;
          this.height = 0;
          this.colorAttachments = [];
          this.depthAttachment = null;
          this.stencilAttachment = null;
          this.depthStencilAttachment = null;
        }
        function decFBORefs(framebuffer) {
          framebuffer.colorAttachments.forEach(decRef);
          decRef(framebuffer.depthAttachment);
          decRef(framebuffer.stencilAttachment);
          decRef(framebuffer.depthStencilAttachment);
        }
        function destroy(framebuffer) {
          var handle = framebuffer.framebuffer;
          check$1(handle, "must not double destroy framebuffer");
          gl.deleteFramebuffer(handle);
          framebuffer.framebuffer = null;
          stats2.framebufferCount--;
          delete framebufferSet[framebuffer.id];
        }
        function updateFramebuffer(framebuffer) {
          var i;
          gl.bindFramebuffer(GL_FRAMEBUFFER$1, framebuffer.framebuffer);
          var colorAttachments = framebuffer.colorAttachments;
          for (i = 0; i < colorAttachments.length; ++i) {
            attach(GL_COLOR_ATTACHMENT0$1 + i, colorAttachments[i]);
          }
          for (i = colorAttachments.length; i < limits.maxColorAttachments; ++i) {
            gl.framebufferTexture2D(GL_FRAMEBUFFER$1, GL_COLOR_ATTACHMENT0$1 + i, GL_TEXTURE_2D$2, null, 0);
          }
          gl.framebufferTexture2D(GL_FRAMEBUFFER$1, GL_DEPTH_STENCIL_ATTACHMENT, GL_TEXTURE_2D$2, null, 0);
          gl.framebufferTexture2D(GL_FRAMEBUFFER$1, GL_DEPTH_ATTACHMENT, GL_TEXTURE_2D$2, null, 0);
          gl.framebufferTexture2D(GL_FRAMEBUFFER$1, GL_STENCIL_ATTACHMENT, GL_TEXTURE_2D$2, null, 0);
          attach(GL_DEPTH_ATTACHMENT, framebuffer.depthAttachment);
          attach(GL_STENCIL_ATTACHMENT, framebuffer.stencilAttachment);
          attach(GL_DEPTH_STENCIL_ATTACHMENT, framebuffer.depthStencilAttachment);
          var status = gl.checkFramebufferStatus(GL_FRAMEBUFFER$1);
          if (!gl.isContextLost() && status !== GL_FRAMEBUFFER_COMPLETE$1) {
            check$1.raise("framebuffer configuration not supported, status = " + statusCode[status]);
          }
          gl.bindFramebuffer(GL_FRAMEBUFFER$1, framebufferState.next ? framebufferState.next.framebuffer : null);
          framebufferState.cur = framebufferState.next;
          gl.getError();
        }
        function createFBO(a0, a1) {
          var framebuffer = new REGLFramebuffer();
          stats2.framebufferCount++;
          function reglFramebuffer(a, b) {
            var i;
            check$1(framebufferState.next !== framebuffer, "can not update framebuffer which is currently in use");
            var width = 0;
            var height = 0;
            var needsDepth = true;
            var needsStencil = true;
            var colorBuffer = null;
            var colorTexture = true;
            var colorFormat = "rgba";
            var colorType = "uint8";
            var colorCount = 1;
            var depthBuffer = null;
            var stencilBuffer = null;
            var depthStencilBuffer = null;
            var depthStencilTexture = false;
            if (typeof a === "number") {
              width = a | 0;
              height = b | 0 || width;
            } else if (!a) {
              width = height = 1;
            } else {
              check$1.type(a, "object", "invalid arguments for framebuffer");
              var options2 = a;
              if ("shape" in options2) {
                var shape = options2.shape;
                check$1(Array.isArray(shape) && shape.length >= 2, "invalid shape for framebuffer");
                width = shape[0];
                height = shape[1];
              } else {
                if ("radius" in options2) {
                  width = height = options2.radius;
                }
                if ("width" in options2) {
                  width = options2.width;
                }
                if ("height" in options2) {
                  height = options2.height;
                }
              }
              if ("color" in options2 || "colors" in options2) {
                colorBuffer = options2.color || options2.colors;
                if (Array.isArray(colorBuffer)) {
                  check$1(colorBuffer.length === 1 || extensions.webgl_draw_buffers, "multiple render targets not supported");
                }
              }
              if (!colorBuffer) {
                if ("colorCount" in options2) {
                  colorCount = options2.colorCount | 0;
                  check$1(colorCount > 0, "invalid color buffer count");
                }
                if ("colorTexture" in options2) {
                  colorTexture = !!options2.colorTexture;
                  colorFormat = "rgba4";
                }
                if ("colorType" in options2) {
                  colorType = options2.colorType;
                  if (!colorTexture) {
                    if (colorType === "half float" || colorType === "float16") {
                      check$1(extensions.ext_color_buffer_half_float, "you must enable EXT_color_buffer_half_float to use 16-bit render buffers");
                      colorFormat = "rgba16f";
                    } else if (colorType === "float" || colorType === "float32") {
                      check$1(extensions.webgl_color_buffer_float, "you must enable WEBGL_color_buffer_float in order to use 32-bit floating point renderbuffers");
                      colorFormat = "rgba32f";
                    }
                  } else {
                    check$1(extensions.oes_texture_float || !(colorType === "float" || colorType === "float32"), "you must enable OES_texture_float in order to use floating point framebuffer objects");
                    check$1(extensions.oes_texture_half_float || !(colorType === "half float" || colorType === "float16"), "you must enable OES_texture_half_float in order to use 16-bit floating point framebuffer objects");
                  }
                  check$1.oneOf(colorType, colorTypes, "invalid color type");
                }
                if ("colorFormat" in options2) {
                  colorFormat = options2.colorFormat;
                  if (colorTextureFormats.indexOf(colorFormat) >= 0) {
                    colorTexture = true;
                  } else if (colorRenderbufferFormats.indexOf(colorFormat) >= 0) {
                    colorTexture = false;
                  } else {
                    check$1.optional(function() {
                      if (colorTexture) {
                        check$1.oneOf(options2.colorFormat, colorTextureFormats, "invalid color format for texture");
                      } else {
                        check$1.oneOf(options2.colorFormat, colorRenderbufferFormats, "invalid color format for renderbuffer");
                      }
                    });
                  }
                }
              }
              if ("depthTexture" in options2 || "depthStencilTexture" in options2) {
                depthStencilTexture = !!(options2.depthTexture || options2.depthStencilTexture);
                check$1(!depthStencilTexture || extensions.webgl_depth_texture, "webgl_depth_texture extension not supported");
              }
              if ("depth" in options2) {
                if (typeof options2.depth === "boolean") {
                  needsDepth = options2.depth;
                } else {
                  depthBuffer = options2.depth;
                  needsStencil = false;
                }
              }
              if ("stencil" in options2) {
                if (typeof options2.stencil === "boolean") {
                  needsStencil = options2.stencil;
                } else {
                  stencilBuffer = options2.stencil;
                  needsDepth = false;
                }
              }
              if ("depthStencil" in options2) {
                if (typeof options2.depthStencil === "boolean") {
                  needsDepth = needsStencil = options2.depthStencil;
                } else {
                  depthStencilBuffer = options2.depthStencil;
                  needsDepth = false;
                  needsStencil = false;
                }
              }
            }
            var colorAttachments = null;
            var depthAttachment = null;
            var stencilAttachment = null;
            var depthStencilAttachment = null;
            if (Array.isArray(colorBuffer)) {
              colorAttachments = colorBuffer.map(parseAttachment);
            } else if (colorBuffer) {
              colorAttachments = [parseAttachment(colorBuffer)];
            } else {
              colorAttachments = new Array(colorCount);
              for (i = 0; i < colorCount; ++i) {
                colorAttachments[i] = allocAttachment(width, height, colorTexture, colorFormat, colorType);
              }
            }
            check$1(extensions.webgl_draw_buffers || colorAttachments.length <= 1, "you must enable the WEBGL_draw_buffers extension in order to use multiple color buffers.");
            check$1(colorAttachments.length <= limits.maxColorAttachments, "too many color attachments, not supported");
            width = width || colorAttachments[0].width;
            height = height || colorAttachments[0].height;
            if (depthBuffer) {
              depthAttachment = parseAttachment(depthBuffer);
            } else if (needsDepth && !needsStencil) {
              depthAttachment = allocAttachment(width, height, depthStencilTexture, "depth", "uint32");
            }
            if (stencilBuffer) {
              stencilAttachment = parseAttachment(stencilBuffer);
            } else if (needsStencil && !needsDepth) {
              stencilAttachment = allocAttachment(width, height, false, "stencil", "uint8");
            }
            if (depthStencilBuffer) {
              depthStencilAttachment = parseAttachment(depthStencilBuffer);
            } else if (!depthBuffer && !stencilBuffer && needsStencil && needsDepth) {
              depthStencilAttachment = allocAttachment(width, height, depthStencilTexture, "depth stencil", "depth stencil");
            }
            check$1(!!depthBuffer + !!stencilBuffer + !!depthStencilBuffer <= 1, "invalid framebuffer configuration, can specify exactly one depth/stencil attachment");
            var commonColorAttachmentSize = null;
            for (i = 0; i < colorAttachments.length; ++i) {
              incRefAndCheckShape(colorAttachments[i], width, height);
              check$1(!colorAttachments[i] || colorAttachments[i].texture && colorTextureFormatEnums.indexOf(colorAttachments[i].texture._texture.format) >= 0 || colorAttachments[i].renderbuffer && colorRenderbufferFormatEnums.indexOf(colorAttachments[i].renderbuffer._renderbuffer.format) >= 0, "framebuffer color attachment " + i + " is invalid");
              if (colorAttachments[i] && colorAttachments[i].texture) {
                var colorAttachmentSize = textureFormatChannels[colorAttachments[i].texture._texture.format] * textureTypeSizes[colorAttachments[i].texture._texture.type];
                if (commonColorAttachmentSize === null) {
                  commonColorAttachmentSize = colorAttachmentSize;
                } else {
                  check$1(commonColorAttachmentSize === colorAttachmentSize, "all color attachments much have the same number of bits per pixel.");
                }
              }
            }
            incRefAndCheckShape(depthAttachment, width, height);
            check$1(!depthAttachment || depthAttachment.texture && depthAttachment.texture._texture.format === GL_DEPTH_COMPONENT$1 || depthAttachment.renderbuffer && depthAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_COMPONENT16$1, "invalid depth attachment for framebuffer object");
            incRefAndCheckShape(stencilAttachment, width, height);
            check$1(!stencilAttachment || stencilAttachment.renderbuffer && stencilAttachment.renderbuffer._renderbuffer.format === GL_STENCIL_INDEX8$1, "invalid stencil attachment for framebuffer object");
            incRefAndCheckShape(depthStencilAttachment, width, height);
            check$1(!depthStencilAttachment || depthStencilAttachment.texture && depthStencilAttachment.texture._texture.format === GL_DEPTH_STENCIL$2 || depthStencilAttachment.renderbuffer && depthStencilAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_STENCIL$2, "invalid depth-stencil attachment for framebuffer object");
            decFBORefs(framebuffer);
            framebuffer.width = width;
            framebuffer.height = height;
            framebuffer.colorAttachments = colorAttachments;
            framebuffer.depthAttachment = depthAttachment;
            framebuffer.stencilAttachment = stencilAttachment;
            framebuffer.depthStencilAttachment = depthStencilAttachment;
            reglFramebuffer.color = colorAttachments.map(unwrapAttachment);
            reglFramebuffer.depth = unwrapAttachment(depthAttachment);
            reglFramebuffer.stencil = unwrapAttachment(stencilAttachment);
            reglFramebuffer.depthStencil = unwrapAttachment(depthStencilAttachment);
            reglFramebuffer.width = framebuffer.width;
            reglFramebuffer.height = framebuffer.height;
            updateFramebuffer(framebuffer);
            return reglFramebuffer;
          }
          function resize(w_, h_) {
            check$1(framebufferState.next !== framebuffer, "can not resize a framebuffer which is currently in use");
            var w = Math.max(w_ | 0, 1);
            var h = Math.max(h_ | 0 || w, 1);
            if (w === framebuffer.width && h === framebuffer.height) {
              return reglFramebuffer;
            }
            var colorAttachments = framebuffer.colorAttachments;
            for (var i = 0; i < colorAttachments.length; ++i) {
              resizeAttachment(colorAttachments[i], w, h);
            }
            resizeAttachment(framebuffer.depthAttachment, w, h);
            resizeAttachment(framebuffer.stencilAttachment, w, h);
            resizeAttachment(framebuffer.depthStencilAttachment, w, h);
            framebuffer.width = reglFramebuffer.width = w;
            framebuffer.height = reglFramebuffer.height = h;
            updateFramebuffer(framebuffer);
            return reglFramebuffer;
          }
          reglFramebuffer(a0, a1);
          return extend(reglFramebuffer, {
            resize,
            _reglType: "framebuffer",
            _framebuffer: framebuffer,
            destroy: function() {
              destroy(framebuffer);
              decFBORefs(framebuffer);
            },
            use: function(block) {
              framebufferState.setFBO({
                framebuffer: reglFramebuffer
              }, block);
            }
          });
        }
        function createCubeFBO(options2) {
          var faces = Array(6);
          function reglFramebufferCube(a) {
            var i;
            check$1(faces.indexOf(framebufferState.next) < 0, "can not update framebuffer which is currently in use");
            var params = {
              color: null
            };
            var radius = 0;
            var colorBuffer = null;
            var colorFormat = "rgba";
            var colorType = "uint8";
            var colorCount = 1;
            if (typeof a === "number") {
              radius = a | 0;
            } else if (!a) {
              radius = 1;
            } else {
              check$1.type(a, "object", "invalid arguments for framebuffer");
              var options3 = a;
              if ("shape" in options3) {
                var shape = options3.shape;
                check$1(Array.isArray(shape) && shape.length >= 2, "invalid shape for framebuffer");
                check$1(shape[0] === shape[1], "cube framebuffer must be square");
                radius = shape[0];
              } else {
                if ("radius" in options3) {
                  radius = options3.radius | 0;
                }
                if ("width" in options3) {
                  radius = options3.width | 0;
                  if ("height" in options3) {
                    check$1(options3.height === radius, "must be square");
                  }
                } else if ("height" in options3) {
                  radius = options3.height | 0;
                }
              }
              if ("color" in options3 || "colors" in options3) {
                colorBuffer = options3.color || options3.colors;
                if (Array.isArray(colorBuffer)) {
                  check$1(colorBuffer.length === 1 || extensions.webgl_draw_buffers, "multiple render targets not supported");
                }
              }
              if (!colorBuffer) {
                if ("colorCount" in options3) {
                  colorCount = options3.colorCount | 0;
                  check$1(colorCount > 0, "invalid color buffer count");
                }
                if ("colorType" in options3) {
                  check$1.oneOf(options3.colorType, colorTypes, "invalid color type");
                  colorType = options3.colorType;
                }
                if ("colorFormat" in options3) {
                  colorFormat = options3.colorFormat;
                  check$1.oneOf(options3.colorFormat, colorTextureFormats, "invalid color format for texture");
                }
              }
              if ("depth" in options3) {
                params.depth = options3.depth;
              }
              if ("stencil" in options3) {
                params.stencil = options3.stencil;
              }
              if ("depthStencil" in options3) {
                params.depthStencil = options3.depthStencil;
              }
            }
            var colorCubes;
            if (colorBuffer) {
              if (Array.isArray(colorBuffer)) {
                colorCubes = [];
                for (i = 0; i < colorBuffer.length; ++i) {
                  colorCubes[i] = colorBuffer[i];
                }
              } else {
                colorCubes = [colorBuffer];
              }
            } else {
              colorCubes = Array(colorCount);
              var cubeMapParams = {
                radius,
                format: colorFormat,
                type: colorType
              };
              for (i = 0; i < colorCount; ++i) {
                colorCubes[i] = textureState.createCube(cubeMapParams);
              }
            }
            params.color = Array(colorCubes.length);
            for (i = 0; i < colorCubes.length; ++i) {
              var cube = colorCubes[i];
              check$1(typeof cube === "function" && cube._reglType === "textureCube", "invalid cube map");
              radius = radius || cube.width;
              check$1(cube.width === radius && cube.height === radius, "invalid cube map shape");
              params.color[i] = {
                target: GL_TEXTURE_CUBE_MAP_POSITIVE_X$2,
                data: colorCubes[i]
              };
            }
            for (i = 0; i < 6; ++i) {
              for (var j = 0; j < colorCubes.length; ++j) {
                params.color[j].target = GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 + i;
              }
              if (i > 0) {
                params.depth = faces[0].depth;
                params.stencil = faces[0].stencil;
                params.depthStencil = faces[0].depthStencil;
              }
              if (faces[i]) {
                faces[i](params);
              } else {
                faces[i] = createFBO(params);
              }
            }
            return extend(reglFramebufferCube, {
              width: radius,
              height: radius,
              color: colorCubes
            });
          }
          function resize(radius_) {
            var i;
            var radius = radius_ | 0;
            check$1(radius > 0 && radius <= limits.maxCubeMapSize, "invalid radius for cube fbo");
            if (radius === reglFramebufferCube.width) {
              return reglFramebufferCube;
            }
            var colors = reglFramebufferCube.color;
            for (i = 0; i < colors.length; ++i) {
              colors[i].resize(radius);
            }
            for (i = 0; i < 6; ++i) {
              faces[i].resize(radius);
            }
            reglFramebufferCube.width = reglFramebufferCube.height = radius;
            return reglFramebufferCube;
          }
          reglFramebufferCube(options2);
          return extend(reglFramebufferCube, {
            faces,
            resize,
            _reglType: "framebufferCube",
            destroy: function() {
              faces.forEach(function(f) {
                f.destroy();
              });
            }
          });
        }
        function restoreFramebuffers() {
          framebufferState.cur = null;
          framebufferState.next = null;
          framebufferState.dirty = true;
          values(framebufferSet).forEach(function(fb) {
            fb.framebuffer = gl.createFramebuffer();
            updateFramebuffer(fb);
          });
        }
        return extend(framebufferState, {
          getFramebuffer: function(object) {
            if (typeof object === "function" && object._reglType === "framebuffer") {
              var fbo = object._framebuffer;
              if (fbo instanceof REGLFramebuffer) {
                return fbo;
              }
            }
            return null;
          },
          create: createFBO,
          createCube: createCubeFBO,
          clear: function() {
            values(framebufferSet).forEach(destroy);
          },
          restore: restoreFramebuffers
        });
      }
      var GL_FLOAT$6 = 5126;
      var GL_ARRAY_BUFFER$1 = 34962;
      var GL_ELEMENT_ARRAY_BUFFER$1 = 34963;
      var VAO_OPTIONS = [
        "attributes",
        "elements",
        "offset",
        "count",
        "primitive",
        "instances"
      ];
      function AttributeRecord() {
        this.state = 0;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
        this.buffer = null;
        this.size = 0;
        this.normalized = false;
        this.type = GL_FLOAT$6;
        this.offset = 0;
        this.stride = 0;
        this.divisor = 0;
      }
      function wrapAttributeState(gl, extensions, limits, stats2, bufferState, elementState, drawState) {
        var NUM_ATTRIBUTES = limits.maxAttributes;
        var attributeBindings = new Array(NUM_ATTRIBUTES);
        for (var i = 0; i < NUM_ATTRIBUTES; ++i) {
          attributeBindings[i] = new AttributeRecord();
        }
        var vaoCount = 0;
        var vaoSet = {};
        var state = {
          Record: AttributeRecord,
          scope: {},
          state: attributeBindings,
          currentVAO: null,
          targetVAO: null,
          restore: extVAO() ? restoreVAO : function() {
          },
          createVAO,
          getVAO,
          destroyBuffer,
          setVAO: extVAO() ? setVAOEXT : setVAOEmulated,
          clear: extVAO() ? destroyVAOEXT : function() {
          }
        };
        function destroyBuffer(buffer) {
          for (var i2 = 0; i2 < attributeBindings.length; ++i2) {
            var record = attributeBindings[i2];
            if (record.buffer === buffer) {
              gl.disableVertexAttribArray(i2);
              record.buffer = null;
            }
          }
        }
        function extVAO() {
          return extensions.oes_vertex_array_object;
        }
        function extInstanced() {
          return extensions.angle_instanced_arrays;
        }
        function getVAO(vao) {
          if (typeof vao === "function" && vao._vao) {
            return vao._vao;
          }
          return null;
        }
        function setVAOEXT(vao) {
          if (vao === state.currentVAO) {
            return;
          }
          var ext = extVAO();
          if (vao) {
            ext.bindVertexArrayOES(vao.vao);
          } else {
            ext.bindVertexArrayOES(null);
          }
          state.currentVAO = vao;
        }
        function setVAOEmulated(vao) {
          if (vao === state.currentVAO) {
            return;
          }
          if (vao) {
            vao.bindAttrs();
          } else {
            var exti = extInstanced();
            for (var i2 = 0; i2 < attributeBindings.length; ++i2) {
              var binding = attributeBindings[i2];
              if (binding.buffer) {
                gl.enableVertexAttribArray(i2);
                binding.buffer.bind();
                gl.vertexAttribPointer(i2, binding.size, binding.type, binding.normalized, binding.stride, binding.offfset);
                if (exti && binding.divisor) {
                  exti.vertexAttribDivisorANGLE(i2, binding.divisor);
                }
              } else {
                gl.disableVertexAttribArray(i2);
                gl.vertexAttrib4f(i2, binding.x, binding.y, binding.z, binding.w);
              }
            }
            if (drawState.elements) {
              gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER$1, drawState.elements.buffer.buffer);
            } else {
              gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER$1, null);
            }
          }
          state.currentVAO = vao;
        }
        function destroyVAOEXT() {
          values(vaoSet).forEach(function(vao) {
            vao.destroy();
          });
        }
        function REGLVAO() {
          this.id = ++vaoCount;
          this.attributes = [];
          this.elements = null;
          this.ownsElements = false;
          this.count = 0;
          this.offset = 0;
          this.instances = -1;
          this.primitive = 4;
          var extension = extVAO();
          if (extension) {
            this.vao = extension.createVertexArrayOES();
          } else {
            this.vao = null;
          }
          vaoSet[this.id] = this;
          this.buffers = [];
        }
        REGLVAO.prototype.bindAttrs = function() {
          var exti = extInstanced();
          var attributes = this.attributes;
          for (var i2 = 0; i2 < attributes.length; ++i2) {
            var attr = attributes[i2];
            if (attr.buffer) {
              gl.enableVertexAttribArray(i2);
              gl.bindBuffer(GL_ARRAY_BUFFER$1, attr.buffer.buffer);
              gl.vertexAttribPointer(i2, attr.size, attr.type, attr.normalized, attr.stride, attr.offset);
              if (exti && attr.divisor) {
                exti.vertexAttribDivisorANGLE(i2, attr.divisor);
              }
            } else {
              gl.disableVertexAttribArray(i2);
              gl.vertexAttrib4f(i2, attr.x, attr.y, attr.z, attr.w);
            }
          }
          for (var j = attributes.length; j < NUM_ATTRIBUTES; ++j) {
            gl.disableVertexAttribArray(j);
          }
          var elements = elementState.getElements(this.elements);
          if (elements) {
            gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER$1, elements.buffer.buffer);
          } else {
            gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER$1, null);
          }
        };
        REGLVAO.prototype.refresh = function() {
          var ext = extVAO();
          if (ext) {
            ext.bindVertexArrayOES(this.vao);
            this.bindAttrs();
            state.currentVAO = null;
            ext.bindVertexArrayOES(null);
          }
        };
        REGLVAO.prototype.destroy = function() {
          if (this.vao) {
            var extension = extVAO();
            if (this === state.currentVAO) {
              state.currentVAO = null;
              extension.bindVertexArrayOES(null);
            }
            extension.deleteVertexArrayOES(this.vao);
            this.vao = null;
          }
          if (this.ownsElements) {
            this.elements.destroy();
            this.elements = null;
            this.ownsElements = false;
          }
          if (vaoSet[this.id]) {
            delete vaoSet[this.id];
            stats2.vaoCount -= 1;
          }
        };
        function restoreVAO() {
          var ext = extVAO();
          if (ext) {
            values(vaoSet).forEach(function(vao) {
              vao.refresh();
            });
          }
        }
        function createVAO(_attr) {
          var vao = new REGLVAO();
          stats2.vaoCount += 1;
          function updateVAO(options2) {
            var attributes;
            if (Array.isArray(options2)) {
              attributes = options2;
              if (vao.elements && vao.ownsElements) {
                vao.elements.destroy();
              }
              vao.elements = null;
              vao.ownsElements = false;
              vao.offset = 0;
              vao.count = 0;
              vao.instances = -1;
              vao.primitive = 4;
            } else {
              check$1(typeof options2 === "object", "invalid arguments for create vao");
              check$1("attributes" in options2, "must specify attributes for vao");
              if (options2.elements) {
                var elements = options2.elements;
                if (vao.ownsElements) {
                  if (typeof elements === "function" && elements._reglType === "elements") {
                    vao.elements.destroy();
                    vao.ownsElements = false;
                  } else {
                    vao.elements(elements);
                    vao.ownsElements = false;
                  }
                } else if (elementState.getElements(options2.elements)) {
                  vao.elements = options2.elements;
                  vao.ownsElements = false;
                } else {
                  vao.elements = elementState.create(options2.elements);
                  vao.ownsElements = true;
                }
              } else {
                vao.elements = null;
                vao.ownsElements = false;
              }
              attributes = options2.attributes;
              vao.offset = 0;
              vao.count = -1;
              vao.instances = -1;
              vao.primitive = 4;
              if (vao.elements) {
                vao.count = vao.elements._elements.vertCount;
                vao.primitive = vao.elements._elements.primType;
              }
              if ("offset" in options2) {
                vao.offset = options2.offset | 0;
              }
              if ("count" in options2) {
                vao.count = options2.count | 0;
              }
              if ("instances" in options2) {
                vao.instances = options2.instances | 0;
              }
              if ("primitive" in options2) {
                check$1(options2.primitive in primTypes, "bad primitive type: " + options2.primitive);
                vao.primitive = primTypes[options2.primitive];
              }
              check$1.optional(() => {
                var keys = Object.keys(options2);
                for (var i3 = 0; i3 < keys.length; ++i3) {
                  check$1(VAO_OPTIONS.indexOf(keys[i3]) >= 0, 'invalid option for vao: "' + keys[i3] + '" valid options are ' + VAO_OPTIONS);
                }
              });
              check$1(Array.isArray(attributes), "attributes must be an array");
            }
            check$1(attributes.length < NUM_ATTRIBUTES, "too many attributes");
            check$1(attributes.length > 0, "must specify at least one attribute");
            var bufUpdated = {};
            var nattributes = vao.attributes;
            nattributes.length = attributes.length;
            for (var i2 = 0; i2 < attributes.length; ++i2) {
              var spec = attributes[i2];
              var rec = nattributes[i2] = new AttributeRecord();
              var data2 = spec.data || spec;
              if (Array.isArray(data2) || isTypedArray(data2) || isNDArrayLike(data2)) {
                var buf;
                if (vao.buffers[i2]) {
                  buf = vao.buffers[i2];
                  if (isTypedArray(data2) && buf._buffer.byteLength >= data2.byteLength) {
                    buf.subdata(data2);
                  } else {
                    buf.destroy();
                    vao.buffers[i2] = null;
                  }
                }
                if (!vao.buffers[i2]) {
                  buf = vao.buffers[i2] = bufferState.create(spec, GL_ARRAY_BUFFER$1, false, true);
                }
                rec.buffer = bufferState.getBuffer(buf);
                rec.size = rec.buffer.dimension | 0;
                rec.normalized = false;
                rec.type = rec.buffer.dtype;
                rec.offset = 0;
                rec.stride = 0;
                rec.divisor = 0;
                rec.state = 1;
                bufUpdated[i2] = 1;
              } else if (bufferState.getBuffer(spec)) {
                rec.buffer = bufferState.getBuffer(spec);
                rec.size = rec.buffer.dimension | 0;
                rec.normalized = false;
                rec.type = rec.buffer.dtype;
                rec.offset = 0;
                rec.stride = 0;
                rec.divisor = 0;
                rec.state = 1;
              } else if (bufferState.getBuffer(spec.buffer)) {
                rec.buffer = bufferState.getBuffer(spec.buffer);
                rec.size = (+spec.size || rec.buffer.dimension) | 0;
                rec.normalized = !!spec.normalized || false;
                if ("type" in spec) {
                  check$1.parameter(spec.type, glTypes, "invalid buffer type");
                  rec.type = glTypes[spec.type];
                } else {
                  rec.type = rec.buffer.dtype;
                }
                rec.offset = (spec.offset || 0) | 0;
                rec.stride = (spec.stride || 0) | 0;
                rec.divisor = (spec.divisor || 0) | 0;
                rec.state = 1;
                check$1(rec.size >= 1 && rec.size <= 4, "size must be between 1 and 4");
                check$1(rec.offset >= 0, "invalid offset");
                check$1(rec.stride >= 0 && rec.stride <= 255, "stride must be between 0 and 255");
                check$1(rec.divisor >= 0, "divisor must be positive");
                check$1(!rec.divisor || !!extensions.angle_instanced_arrays, "ANGLE_instanced_arrays must be enabled to use divisor");
              } else if ("x" in spec) {
                check$1(i2 > 0, "first attribute must not be a constant");
                rec.x = +spec.x || 0;
                rec.y = +spec.y || 0;
                rec.z = +spec.z || 0;
                rec.w = +spec.w || 0;
                rec.state = 2;
              } else {
                check$1(false, "invalid attribute spec for location " + i2);
              }
            }
            for (var j = 0; j < vao.buffers.length; ++j) {
              if (!bufUpdated[j] && vao.buffers[j]) {
                vao.buffers[j].destroy();
                vao.buffers[j] = null;
              }
            }
            vao.refresh();
            return updateVAO;
          }
          updateVAO.destroy = function() {
            for (var j = 0; j < vao.buffers.length; ++j) {
              if (vao.buffers[j]) {
                vao.buffers[j].destroy();
              }
            }
            vao.buffers.length = 0;
            if (vao.ownsElements) {
              vao.elements.destroy();
              vao.elements = null;
              vao.ownsElements = false;
            }
            vao.destroy();
          };
          updateVAO._vao = vao;
          updateVAO._reglType = "vao";
          return updateVAO(_attr);
        }
        return state;
      }
      var GL_FRAGMENT_SHADER = 35632;
      var GL_VERTEX_SHADER = 35633;
      var GL_ACTIVE_UNIFORMS = 35718;
      var GL_ACTIVE_ATTRIBUTES = 35721;
      function wrapShaderState(gl, stringStore, stats2, config) {
        var fragShaders = {};
        var vertShaders = {};
        function ActiveInfo(name, id, location, info) {
          this.name = name;
          this.id = id;
          this.location = location;
          this.info = info;
        }
        function insertActiveInfo(list, info) {
          for (var i = 0; i < list.length; ++i) {
            if (list[i].id === info.id) {
              list[i].location = info.location;
              return;
            }
          }
          list.push(info);
        }
        function getShader(type, id, command) {
          var cache = type === GL_FRAGMENT_SHADER ? fragShaders : vertShaders;
          var shader2 = cache[id];
          if (!shader2) {
            var source = stringStore.str(id);
            shader2 = gl.createShader(type);
            gl.shaderSource(shader2, source);
            gl.compileShader(shader2);
            check$1.shaderError(gl, shader2, source, type, command);
            cache[id] = shader2;
          }
          return shader2;
        }
        var programCache = {};
        var programList = [];
        var PROGRAM_COUNTER = 0;
        function REGLProgram(fragId, vertId) {
          this.id = PROGRAM_COUNTER++;
          this.fragId = fragId;
          this.vertId = vertId;
          this.program = null;
          this.uniforms = [];
          this.attributes = [];
          this.refCount = 1;
          if (config.profile) {
            this.stats = {
              uniformsCount: 0,
              attributesCount: 0
            };
          }
        }
        function linkProgram(desc, command, attributeLocations) {
          var i, info;
          var fragShader = getShader(GL_FRAGMENT_SHADER, desc.fragId);
          var vertShader = getShader(GL_VERTEX_SHADER, desc.vertId);
          var program = desc.program = gl.createProgram();
          gl.attachShader(program, fragShader);
          gl.attachShader(program, vertShader);
          if (attributeLocations) {
            for (i = 0; i < attributeLocations.length; ++i) {
              var binding = attributeLocations[i];
              gl.bindAttribLocation(program, binding[0], binding[1]);
            }
          }
          gl.linkProgram(program);
          check$1.linkError(gl, program, stringStore.str(desc.fragId), stringStore.str(desc.vertId), command);
          var numUniforms = gl.getProgramParameter(program, GL_ACTIVE_UNIFORMS);
          if (config.profile) {
            desc.stats.uniformsCount = numUniforms;
          }
          var uniforms = desc.uniforms;
          for (i = 0; i < numUniforms; ++i) {
            info = gl.getActiveUniform(program, i);
            if (info) {
              if (info.size > 1) {
                for (var j = 0; j < info.size; ++j) {
                  var name = info.name.replace("[0]", "[" + j + "]");
                  insertActiveInfo(uniforms, new ActiveInfo(name, stringStore.id(name), gl.getUniformLocation(program, name), info));
                }
              }
              var uniName = info.name;
              if (info.size > 1) {
                uniName = uniName.replace("[0]", "");
              }
              insertActiveInfo(uniforms, new ActiveInfo(uniName, stringStore.id(uniName), gl.getUniformLocation(program, uniName), info));
            }
          }
          var numAttributes = gl.getProgramParameter(program, GL_ACTIVE_ATTRIBUTES);
          if (config.profile) {
            desc.stats.attributesCount = numAttributes;
          }
          var attributes = desc.attributes;
          for (i = 0; i < numAttributes; ++i) {
            info = gl.getActiveAttrib(program, i);
            if (info) {
              insertActiveInfo(attributes, new ActiveInfo(info.name, stringStore.id(info.name), gl.getAttribLocation(program, info.name), info));
            }
          }
        }
        if (config.profile) {
          stats2.getMaxUniformsCount = function() {
            var m = 0;
            programList.forEach(function(desc) {
              if (desc.stats.uniformsCount > m) {
                m = desc.stats.uniformsCount;
              }
            });
            return m;
          };
          stats2.getMaxAttributesCount = function() {
            var m = 0;
            programList.forEach(function(desc) {
              if (desc.stats.attributesCount > m) {
                m = desc.stats.attributesCount;
              }
            });
            return m;
          };
        }
        function restoreShaders() {
          fragShaders = {};
          vertShaders = {};
          for (var i = 0; i < programList.length; ++i) {
            linkProgram(programList[i], null, programList[i].attributes.map(function(info) {
              return [info.location, info.name];
            }));
          }
        }
        return {
          clear: function() {
            var deleteShader = gl.deleteShader.bind(gl);
            values(fragShaders).forEach(deleteShader);
            fragShaders = {};
            values(vertShaders).forEach(deleteShader);
            vertShaders = {};
            programList.forEach(function(desc) {
              gl.deleteProgram(desc.program);
            });
            programList.length = 0;
            programCache = {};
            stats2.shaderCount = 0;
          },
          program: function(vertId, fragId, command, attribLocations) {
            check$1.command(vertId >= 0, "missing vertex shader", command);
            check$1.command(fragId >= 0, "missing fragment shader", command);
            var cache = programCache[fragId];
            if (!cache) {
              cache = programCache[fragId] = {};
            }
            var prevProgram = cache[vertId];
            if (prevProgram) {
              prevProgram.refCount++;
              if (!attribLocations) {
                return prevProgram;
              }
            }
            var program = new REGLProgram(fragId, vertId);
            stats2.shaderCount++;
            linkProgram(program, command, attribLocations);
            if (!prevProgram) {
              cache[vertId] = program;
            }
            programList.push(program);
            return extend(program, {
              destroy: function() {
                program.refCount--;
                if (program.refCount <= 0) {
                  gl.deleteProgram(program.program);
                  var idx = programList.indexOf(program);
                  programList.splice(idx, 1);
                  stats2.shaderCount--;
                }
                if (cache[program.vertId].refCount <= 0) {
                  gl.deleteShader(vertShaders[program.vertId]);
                  delete vertShaders[program.vertId];
                  delete programCache[program.fragId][program.vertId];
                }
                if (!Object.keys(programCache[program.fragId]).length) {
                  gl.deleteShader(fragShaders[program.fragId]);
                  delete fragShaders[program.fragId];
                  delete programCache[program.fragId];
                }
              }
            });
          },
          restore: restoreShaders,
          shader: getShader,
          frag: -1,
          vert: -1
        };
      }
      var GL_RGBA$3 = 6408;
      var GL_UNSIGNED_BYTE$7 = 5121;
      var GL_PACK_ALIGNMENT = 3333;
      var GL_FLOAT$7 = 5126;
      function wrapReadPixels(gl, framebufferState, reglPoll, context, glAttributes, extensions, limits) {
        function readPixelsImpl(input) {
          var type;
          if (framebufferState.next === null) {
            check$1(glAttributes.preserveDrawingBuffer, 'you must create a webgl context with "preserveDrawingBuffer":true in order to read pixels from the drawing buffer');
            type = GL_UNSIGNED_BYTE$7;
          } else {
            check$1(framebufferState.next.colorAttachments[0].texture !== null, "You cannot read from a renderbuffer");
            type = framebufferState.next.colorAttachments[0].texture._texture.type;
            check$1.optional(function() {
              if (extensions.oes_texture_float) {
                check$1(type === GL_UNSIGNED_BYTE$7 || type === GL_FLOAT$7, "Reading from a framebuffer is only allowed for the types 'uint8' and 'float'");
                if (type === GL_FLOAT$7) {
                  check$1(limits.readFloat, "Reading 'float' values is not permitted in your browser. For a fallback, please see: https://www.npmjs.com/package/glsl-read-float");
                }
              } else {
                check$1(type === GL_UNSIGNED_BYTE$7, "Reading from a framebuffer is only allowed for the type 'uint8'");
              }
            });
          }
          var x = 0;
          var y = 0;
          var width = context.framebufferWidth;
          var height = context.framebufferHeight;
          var data2 = null;
          if (isTypedArray(input)) {
            data2 = input;
          } else if (input) {
            check$1.type(input, "object", "invalid arguments to regl.read()");
            x = input.x | 0;
            y = input.y | 0;
            check$1(x >= 0 && x < context.framebufferWidth, "invalid x offset for regl.read");
            check$1(y >= 0 && y < context.framebufferHeight, "invalid y offset for regl.read");
            width = (input.width || context.framebufferWidth - x) | 0;
            height = (input.height || context.framebufferHeight - y) | 0;
            data2 = input.data || null;
          }
          if (data2) {
            if (type === GL_UNSIGNED_BYTE$7) {
              check$1(data2 instanceof Uint8Array, "buffer must be 'Uint8Array' when reading from a framebuffer of type 'uint8'");
            } else if (type === GL_FLOAT$7) {
              check$1(data2 instanceof Float32Array, "buffer must be 'Float32Array' when reading from a framebuffer of type 'float'");
            }
          }
          check$1(width > 0 && width + x <= context.framebufferWidth, "invalid width for read pixels");
          check$1(height > 0 && height + y <= context.framebufferHeight, "invalid height for read pixels");
          reglPoll();
          var size = width * height * 4;
          if (!data2) {
            if (type === GL_UNSIGNED_BYTE$7) {
              data2 = new Uint8Array(size);
            } else if (type === GL_FLOAT$7) {
              data2 = data2 || new Float32Array(size);
            }
          }
          check$1.isTypedArray(data2, "data buffer for regl.read() must be a typedarray");
          check$1(data2.byteLength >= size, "data buffer for regl.read() too small");
          gl.pixelStorei(GL_PACK_ALIGNMENT, 4);
          gl.readPixels(x, y, width, height, GL_RGBA$3, type, data2);
          return data2;
        }
        function readPixelsFBO(options2) {
          var result;
          framebufferState.setFBO({
            framebuffer: options2.framebuffer
          }, function() {
            result = readPixelsImpl(options2);
          });
          return result;
        }
        function readPixels(options2) {
          if (!options2 || !("framebuffer" in options2)) {
            return readPixelsImpl(options2);
          } else {
            return readPixelsFBO(options2);
          }
        }
        return readPixels;
      }
      function slice(x) {
        return Array.prototype.slice.call(x);
      }
      function join(x) {
        return slice(x).join("");
      }
      function createEnvironment() {
        var varCounter = 0;
        var linkedNames = [];
        var linkedValues = [];
        function link(value) {
          for (var i = 0; i < linkedValues.length; ++i) {
            if (linkedValues[i] === value) {
              return linkedNames[i];
            }
          }
          var name = "g" + varCounter++;
          linkedNames.push(name);
          linkedValues.push(value);
          return name;
        }
        function block() {
          var code = [];
          function push() {
            code.push.apply(code, slice(arguments));
          }
          var vars = [];
          function def() {
            var name = "v" + varCounter++;
            vars.push(name);
            if (arguments.length > 0) {
              code.push(name, "=");
              code.push.apply(code, slice(arguments));
              code.push(";");
            }
            return name;
          }
          return extend(push, {
            def,
            toString: function() {
              return join([
                vars.length > 0 ? "var " + vars.join(",") + ";" : "",
                join(code)
              ]);
            }
          });
        }
        function scope() {
          var entry = block();
          var exit = block();
          var entryToString = entry.toString;
          var exitToString = exit.toString;
          function save(object, prop) {
            exit(object, prop, "=", entry.def(object, prop), ";");
          }
          return extend(function() {
            entry.apply(entry, slice(arguments));
          }, {
            def: entry.def,
            entry,
            exit,
            save,
            set: function(object, prop, value) {
              save(object, prop);
              entry(object, prop, "=", value, ";");
            },
            toString: function() {
              return entryToString() + exitToString();
            }
          });
        }
        function conditional() {
          var pred = join(arguments);
          var thenBlock = scope();
          var elseBlock = scope();
          var thenToString = thenBlock.toString;
          var elseToString = elseBlock.toString;
          return extend(thenBlock, {
            then: function() {
              thenBlock.apply(thenBlock, slice(arguments));
              return this;
            },
            else: function() {
              elseBlock.apply(elseBlock, slice(arguments));
              return this;
            },
            toString: function() {
              var elseClause = elseToString();
              if (elseClause) {
                elseClause = "else{" + elseClause + "}";
              }
              return join([
                "if(",
                pred,
                "){",
                thenToString(),
                "}",
                elseClause
              ]);
            }
          });
        }
        var globalBlock = block();
        var procedures = {};
        function proc(name, count) {
          var args = [];
          function arg() {
            var name2 = "a" + args.length;
            args.push(name2);
            return name2;
          }
          count = count || 0;
          for (var i = 0; i < count; ++i) {
            arg();
          }
          var body = scope();
          var bodyToString = body.toString;
          var result = procedures[name] = extend(body, {
            arg,
            toString: function() {
              return join([
                "function(",
                args.join(),
                "){",
                bodyToString(),
                "}"
              ]);
            }
          });
          return result;
        }
        function compile() {
          var code = [
            '"use strict";',
            globalBlock,
            "return {"
          ];
          Object.keys(procedures).forEach(function(name) {
            code.push('"', name, '":', procedures[name].toString(), ",");
          });
          code.push("}");
          var src2 = join(code).replace(/;/g, ";\n").replace(/}/g, "}\n").replace(/{/g, "{\n");
          var proc2 = Function.apply(null, linkedNames.concat(src2));
          return proc2.apply(null, linkedValues);
        }
        return {
          global: globalBlock,
          link,
          block,
          proc,
          scope,
          cond: conditional,
          compile
        };
      }
      var CUTE_COMPONENTS = "xyzw".split("");
      var GL_UNSIGNED_BYTE$8 = 5121;
      var ATTRIB_STATE_POINTER = 1;
      var ATTRIB_STATE_CONSTANT = 2;
      var DYN_FUNC$1 = 0;
      var DYN_PROP$1 = 1;
      var DYN_CONTEXT$1 = 2;
      var DYN_STATE$1 = 3;
      var DYN_THUNK = 4;
      var DYN_CONSTANT$1 = 5;
      var DYN_ARRAY$1 = 6;
      var S_DITHER = "dither";
      var S_BLEND_ENABLE = "blend.enable";
      var S_BLEND_COLOR = "blend.color";
      var S_BLEND_EQUATION = "blend.equation";
      var S_BLEND_FUNC = "blend.func";
      var S_DEPTH_ENABLE = "depth.enable";
      var S_DEPTH_FUNC = "depth.func";
      var S_DEPTH_RANGE = "depth.range";
      var S_DEPTH_MASK = "depth.mask";
      var S_COLOR_MASK = "colorMask";
      var S_CULL_ENABLE = "cull.enable";
      var S_CULL_FACE = "cull.face";
      var S_FRONT_FACE = "frontFace";
      var S_LINE_WIDTH = "lineWidth";
      var S_POLYGON_OFFSET_ENABLE = "polygonOffset.enable";
      var S_POLYGON_OFFSET_OFFSET = "polygonOffset.offset";
      var S_SAMPLE_ALPHA = "sample.alpha";
      var S_SAMPLE_ENABLE = "sample.enable";
      var S_SAMPLE_COVERAGE = "sample.coverage";
      var S_STENCIL_ENABLE = "stencil.enable";
      var S_STENCIL_MASK = "stencil.mask";
      var S_STENCIL_FUNC = "stencil.func";
      var S_STENCIL_OPFRONT = "stencil.opFront";
      var S_STENCIL_OPBACK = "stencil.opBack";
      var S_SCISSOR_ENABLE = "scissor.enable";
      var S_SCISSOR_BOX = "scissor.box";
      var S_VIEWPORT = "viewport";
      var S_PROFILE = "profile";
      var S_FRAMEBUFFER = "framebuffer";
      var S_VERT = "vert";
      var S_FRAG = "frag";
      var S_ELEMENTS = "elements";
      var S_PRIMITIVE = "primitive";
      var S_COUNT = "count";
      var S_OFFSET = "offset";
      var S_INSTANCES = "instances";
      var S_VAO = "vao";
      var SUFFIX_WIDTH = "Width";
      var SUFFIX_HEIGHT = "Height";
      var S_FRAMEBUFFER_WIDTH = S_FRAMEBUFFER + SUFFIX_WIDTH;
      var S_FRAMEBUFFER_HEIGHT = S_FRAMEBUFFER + SUFFIX_HEIGHT;
      var S_VIEWPORT_WIDTH = S_VIEWPORT + SUFFIX_WIDTH;
      var S_VIEWPORT_HEIGHT = S_VIEWPORT + SUFFIX_HEIGHT;
      var S_DRAWINGBUFFER = "drawingBuffer";
      var S_DRAWINGBUFFER_WIDTH = S_DRAWINGBUFFER + SUFFIX_WIDTH;
      var S_DRAWINGBUFFER_HEIGHT = S_DRAWINGBUFFER + SUFFIX_HEIGHT;
      var NESTED_OPTIONS = [
        S_BLEND_FUNC,
        S_BLEND_EQUATION,
        S_STENCIL_FUNC,
        S_STENCIL_OPFRONT,
        S_STENCIL_OPBACK,
        S_SAMPLE_COVERAGE,
        S_VIEWPORT,
        S_SCISSOR_BOX,
        S_POLYGON_OFFSET_OFFSET
      ];
      var GL_ARRAY_BUFFER$2 = 34962;
      var GL_ELEMENT_ARRAY_BUFFER$2 = 34963;
      var GL_FRAGMENT_SHADER$1 = 35632;
      var GL_VERTEX_SHADER$1 = 35633;
      var GL_TEXTURE_2D$3 = 3553;
      var GL_TEXTURE_CUBE_MAP$2 = 34067;
      var GL_CULL_FACE = 2884;
      var GL_BLEND = 3042;
      var GL_DITHER = 3024;
      var GL_STENCIL_TEST = 2960;
      var GL_DEPTH_TEST = 2929;
      var GL_SCISSOR_TEST = 3089;
      var GL_POLYGON_OFFSET_FILL = 32823;
      var GL_SAMPLE_ALPHA_TO_COVERAGE = 32926;
      var GL_SAMPLE_COVERAGE = 32928;
      var GL_FLOAT$8 = 5126;
      var GL_FLOAT_VEC2 = 35664;
      var GL_FLOAT_VEC3 = 35665;
      var GL_FLOAT_VEC4 = 35666;
      var GL_INT$3 = 5124;
      var GL_INT_VEC2 = 35667;
      var GL_INT_VEC3 = 35668;
      var GL_INT_VEC4 = 35669;
      var GL_BOOL = 35670;
      var GL_BOOL_VEC2 = 35671;
      var GL_BOOL_VEC3 = 35672;
      var GL_BOOL_VEC4 = 35673;
      var GL_FLOAT_MAT2 = 35674;
      var GL_FLOAT_MAT3 = 35675;
      var GL_FLOAT_MAT4 = 35676;
      var GL_SAMPLER_2D = 35678;
      var GL_SAMPLER_CUBE = 35680;
      var GL_TRIANGLES$1 = 4;
      var GL_FRONT = 1028;
      var GL_BACK = 1029;
      var GL_CW = 2304;
      var GL_CCW = 2305;
      var GL_MIN_EXT = 32775;
      var GL_MAX_EXT = 32776;
      var GL_ALWAYS = 519;
      var GL_KEEP = 7680;
      var GL_ZERO = 0;
      var GL_ONE = 1;
      var GL_FUNC_ADD = 32774;
      var GL_LESS = 513;
      var GL_FRAMEBUFFER$2 = 36160;
      var GL_COLOR_ATTACHMENT0$2 = 36064;
      var blendFuncs = {
        "0": 0,
        "1": 1,
        "zero": 0,
        "one": 1,
        "src color": 768,
        "one minus src color": 769,
        "src alpha": 770,
        "one minus src alpha": 771,
        "dst color": 774,
        "one minus dst color": 775,
        "dst alpha": 772,
        "one minus dst alpha": 773,
        "constant color": 32769,
        "one minus constant color": 32770,
        "constant alpha": 32771,
        "one minus constant alpha": 32772,
        "src alpha saturate": 776
      };
      var invalidBlendCombinations = [
        "constant color, constant alpha",
        "one minus constant color, constant alpha",
        "constant color, one minus constant alpha",
        "one minus constant color, one minus constant alpha",
        "constant alpha, constant color",
        "constant alpha, one minus constant color",
        "one minus constant alpha, constant color",
        "one minus constant alpha, one minus constant color"
      ];
      var compareFuncs = {
        "never": 512,
        "less": 513,
        "<": 513,
        "equal": 514,
        "=": 514,
        "==": 514,
        "===": 514,
        "lequal": 515,
        "<=": 515,
        "greater": 516,
        ">": 516,
        "notequal": 517,
        "!=": 517,
        "!==": 517,
        "gequal": 518,
        ">=": 518,
        "always": 519
      };
      var stencilOps = {
        "0": 0,
        "zero": 0,
        "keep": 7680,
        "replace": 7681,
        "increment": 7682,
        "decrement": 7683,
        "increment wrap": 34055,
        "decrement wrap": 34056,
        "invert": 5386
      };
      var shaderType = {
        "frag": GL_FRAGMENT_SHADER$1,
        "vert": GL_VERTEX_SHADER$1
      };
      var orientationType = {
        "cw": GL_CW,
        "ccw": GL_CCW
      };
      function isBufferArgs(x) {
        return Array.isArray(x) || isTypedArray(x) || isNDArrayLike(x);
      }
      function sortState(state) {
        return state.sort(function(a, b) {
          if (a === S_VIEWPORT) {
            return -1;
          } else if (b === S_VIEWPORT) {
            return 1;
          }
          return a < b ? -1 : 1;
        });
      }
      function Declaration(thisDep, contextDep, propDep, append) {
        this.thisDep = thisDep;
        this.contextDep = contextDep;
        this.propDep = propDep;
        this.append = append;
      }
      function isStatic(decl) {
        return decl && !(decl.thisDep || decl.contextDep || decl.propDep);
      }
      function createStaticDecl(append) {
        return new Declaration(false, false, false, append);
      }
      function createDynamicDecl(dyn, append) {
        var type = dyn.type;
        if (type === DYN_FUNC$1) {
          var numArgs = dyn.data.length;
          return new Declaration(true, numArgs >= 1, numArgs >= 2, append);
        } else if (type === DYN_THUNK) {
          var data2 = dyn.data;
          return new Declaration(data2.thisDep, data2.contextDep, data2.propDep, append);
        } else if (type === DYN_CONSTANT$1) {
          return new Declaration(false, false, false, append);
        } else if (type === DYN_ARRAY$1) {
          var thisDep = false;
          var contextDep = false;
          var propDep = false;
          for (var i = 0; i < dyn.data.length; ++i) {
            var subDyn = dyn.data[i];
            if (subDyn.type === DYN_PROP$1) {
              propDep = true;
            } else if (subDyn.type === DYN_CONTEXT$1) {
              contextDep = true;
            } else if (subDyn.type === DYN_STATE$1) {
              thisDep = true;
            } else if (subDyn.type === DYN_FUNC$1) {
              thisDep = true;
              var subArgs = subDyn.data;
              if (subArgs >= 1) {
                contextDep = true;
              }
              if (subArgs >= 2) {
                propDep = true;
              }
            } else if (subDyn.type === DYN_THUNK) {
              thisDep = thisDep || subDyn.data.thisDep;
              contextDep = contextDep || subDyn.data.contextDep;
              propDep = propDep || subDyn.data.propDep;
            }
          }
          return new Declaration(thisDep, contextDep, propDep, append);
        } else {
          return new Declaration(type === DYN_STATE$1, type === DYN_CONTEXT$1, type === DYN_PROP$1, append);
        }
      }
      var SCOPE_DECL = new Declaration(false, false, false, function() {
      });
      function reglCore(gl, stringStore, extensions, limits, bufferState, elementState, textureState, framebufferState, uniformState, attributeState, shaderState, drawState, contextState, timer, config) {
        var AttributeRecord2 = attributeState.Record;
        var blendEquations = {
          "add": 32774,
          "subtract": 32778,
          "reverse subtract": 32779
        };
        if (extensions.ext_blend_minmax) {
          blendEquations.min = GL_MIN_EXT;
          blendEquations.max = GL_MAX_EXT;
        }
        var extInstancing = extensions.angle_instanced_arrays;
        var extDrawBuffers = extensions.webgl_draw_buffers;
        var extVertexArrays = extensions.oes_vertex_array_object;
        var currentState = {
          dirty: true,
          profile: config.profile
        };
        var nextState = {};
        var GL_STATE_NAMES = [];
        var GL_FLAGS = {};
        var GL_VARIABLES = {};
        function propName(name) {
          return name.replace(".", "_");
        }
        function stateFlag(sname, cap, init2) {
          var name = propName(sname);
          GL_STATE_NAMES.push(sname);
          nextState[name] = currentState[name] = !!init2;
          GL_FLAGS[name] = cap;
        }
        function stateVariable(sname, func, init2) {
          var name = propName(sname);
          GL_STATE_NAMES.push(sname);
          if (Array.isArray(init2)) {
            currentState[name] = init2.slice();
            nextState[name] = init2.slice();
          } else {
            currentState[name] = nextState[name] = init2;
          }
          GL_VARIABLES[name] = func;
        }
        stateFlag(S_DITHER, GL_DITHER);
        stateFlag(S_BLEND_ENABLE, GL_BLEND);
        stateVariable(S_BLEND_COLOR, "blendColor", [0, 0, 0, 0]);
        stateVariable(S_BLEND_EQUATION, "blendEquationSeparate", [GL_FUNC_ADD, GL_FUNC_ADD]);
        stateVariable(S_BLEND_FUNC, "blendFuncSeparate", [GL_ONE, GL_ZERO, GL_ONE, GL_ZERO]);
        stateFlag(S_DEPTH_ENABLE, GL_DEPTH_TEST, true);
        stateVariable(S_DEPTH_FUNC, "depthFunc", GL_LESS);
        stateVariable(S_DEPTH_RANGE, "depthRange", [0, 1]);
        stateVariable(S_DEPTH_MASK, "depthMask", true);
        stateVariable(S_COLOR_MASK, S_COLOR_MASK, [true, true, true, true]);
        stateFlag(S_CULL_ENABLE, GL_CULL_FACE);
        stateVariable(S_CULL_FACE, "cullFace", GL_BACK);
        stateVariable(S_FRONT_FACE, S_FRONT_FACE, GL_CCW);
        stateVariable(S_LINE_WIDTH, S_LINE_WIDTH, 1);
        stateFlag(S_POLYGON_OFFSET_ENABLE, GL_POLYGON_OFFSET_FILL);
        stateVariable(S_POLYGON_OFFSET_OFFSET, "polygonOffset", [0, 0]);
        stateFlag(S_SAMPLE_ALPHA, GL_SAMPLE_ALPHA_TO_COVERAGE);
        stateFlag(S_SAMPLE_ENABLE, GL_SAMPLE_COVERAGE);
        stateVariable(S_SAMPLE_COVERAGE, "sampleCoverage", [1, false]);
        stateFlag(S_STENCIL_ENABLE, GL_STENCIL_TEST);
        stateVariable(S_STENCIL_MASK, "stencilMask", -1);
        stateVariable(S_STENCIL_FUNC, "stencilFunc", [GL_ALWAYS, 0, -1]);
        stateVariable(S_STENCIL_OPFRONT, "stencilOpSeparate", [GL_FRONT, GL_KEEP, GL_KEEP, GL_KEEP]);
        stateVariable(S_STENCIL_OPBACK, "stencilOpSeparate", [GL_BACK, GL_KEEP, GL_KEEP, GL_KEEP]);
        stateFlag(S_SCISSOR_ENABLE, GL_SCISSOR_TEST);
        stateVariable(S_SCISSOR_BOX, "scissor", [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);
        stateVariable(S_VIEWPORT, S_VIEWPORT, [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);
        var sharedState = {
          gl,
          context: contextState,
          strings: stringStore,
          next: nextState,
          current: currentState,
          draw: drawState,
          elements: elementState,
          buffer: bufferState,
          shader: shaderState,
          attributes: attributeState.state,
          vao: attributeState,
          uniforms: uniformState,
          framebuffer: framebufferState,
          extensions,
          timer,
          isBufferArgs
        };
        var sharedConstants = {
          primTypes,
          compareFuncs,
          blendFuncs,
          blendEquations,
          stencilOps,
          glTypes,
          orientationType
        };
        check$1.optional(function() {
          sharedState.isArrayLike = isArrayLike;
        });
        if (extDrawBuffers) {
          sharedConstants.backBuffer = [GL_BACK];
          sharedConstants.drawBuffer = loop(limits.maxDrawbuffers, function(i) {
            if (i === 0) {
              return [0];
            }
            return loop(i, function(j) {
              return GL_COLOR_ATTACHMENT0$2 + j;
            });
          });
        }
        var drawCallCounter = 0;
        function createREGLEnvironment() {
          var env = createEnvironment();
          var link = env.link;
          var global = env.global;
          env.id = drawCallCounter++;
          env.batchId = "0";
          var SHARED = link(sharedState);
          var shared = env.shared = {
            props: "a0"
          };
          Object.keys(sharedState).forEach(function(prop) {
            shared[prop] = global.def(SHARED, ".", prop);
          });
          check$1.optional(function() {
            env.CHECK = link(check$1);
            env.commandStr = check$1.guessCommand();
            env.command = link(env.commandStr);
            env.assert = function(block, pred, message) {
              block("if(!(", pred, "))", this.CHECK, ".commandRaise(", link(message), ",", this.command, ");");
            };
            sharedConstants.invalidBlendCombinations = invalidBlendCombinations;
          });
          var nextVars = env.next = {};
          var currentVars = env.current = {};
          Object.keys(GL_VARIABLES).forEach(function(variable) {
            if (Array.isArray(currentState[variable])) {
              nextVars[variable] = global.def(shared.next, ".", variable);
              currentVars[variable] = global.def(shared.current, ".", variable);
            }
          });
          var constants = env.constants = {};
          Object.keys(sharedConstants).forEach(function(name) {
            constants[name] = global.def(JSON.stringify(sharedConstants[name]));
          });
          env.invoke = function(block, x) {
            switch (x.type) {
              case DYN_FUNC$1:
                var argList = [
                  "this",
                  shared.context,
                  shared.props,
                  env.batchId
                ];
                return block.def(link(x.data), ".call(", argList.slice(0, Math.max(x.data.length + 1, 4)), ")");
              case DYN_PROP$1:
                return block.def(shared.props, x.data);
              case DYN_CONTEXT$1:
                return block.def(shared.context, x.data);
              case DYN_STATE$1:
                return block.def("this", x.data);
              case DYN_THUNK:
                x.data.append(env, block);
                return x.data.ref;
              case DYN_CONSTANT$1:
                return x.data.toString();
              case DYN_ARRAY$1:
                return x.data.map(function(y) {
                  return env.invoke(block, y);
                });
            }
          };
          env.attribCache = {};
          var scopeAttribs = {};
          env.scopeAttrib = function(name) {
            var id = stringStore.id(name);
            if (id in scopeAttribs) {
              return scopeAttribs[id];
            }
            var binding = attributeState.scope[id];
            if (!binding) {
              binding = attributeState.scope[id] = new AttributeRecord2();
            }
            var result = scopeAttribs[id] = link(binding);
            return result;
          };
          return env;
        }
        function parseProfile(options2) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          var profileEnable;
          if (S_PROFILE in staticOptions) {
            var value = !!staticOptions[S_PROFILE];
            profileEnable = createStaticDecl(function(env, scope) {
              return value;
            });
            profileEnable.enable = value;
          } else if (S_PROFILE in dynamicOptions) {
            var dyn = dynamicOptions[S_PROFILE];
            profileEnable = createDynamicDecl(dyn, function(env, scope) {
              return env.invoke(scope, dyn);
            });
          }
          return profileEnable;
        }
        function parseFramebuffer(options2, env) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          if (S_FRAMEBUFFER in staticOptions) {
            var framebuffer = staticOptions[S_FRAMEBUFFER];
            if (framebuffer) {
              framebuffer = framebufferState.getFramebuffer(framebuffer);
              check$1.command(framebuffer, "invalid framebuffer object");
              return createStaticDecl(function(env2, block) {
                var FRAMEBUFFER = env2.link(framebuffer);
                var shared = env2.shared;
                block.set(shared.framebuffer, ".next", FRAMEBUFFER);
                var CONTEXT = shared.context;
                block.set(CONTEXT, "." + S_FRAMEBUFFER_WIDTH, FRAMEBUFFER + ".width");
                block.set(CONTEXT, "." + S_FRAMEBUFFER_HEIGHT, FRAMEBUFFER + ".height");
                return FRAMEBUFFER;
              });
            } else {
              return createStaticDecl(function(env2, scope) {
                var shared = env2.shared;
                scope.set(shared.framebuffer, ".next", "null");
                var CONTEXT = shared.context;
                scope.set(CONTEXT, "." + S_FRAMEBUFFER_WIDTH, CONTEXT + "." + S_DRAWINGBUFFER_WIDTH);
                scope.set(CONTEXT, "." + S_FRAMEBUFFER_HEIGHT, CONTEXT + "." + S_DRAWINGBUFFER_HEIGHT);
                return "null";
              });
            }
          } else if (S_FRAMEBUFFER in dynamicOptions) {
            var dyn = dynamicOptions[S_FRAMEBUFFER];
            return createDynamicDecl(dyn, function(env2, scope) {
              var FRAMEBUFFER_FUNC = env2.invoke(scope, dyn);
              var shared = env2.shared;
              var FRAMEBUFFER_STATE = shared.framebuffer;
              var FRAMEBUFFER = scope.def(FRAMEBUFFER_STATE, ".getFramebuffer(", FRAMEBUFFER_FUNC, ")");
              check$1.optional(function() {
                env2.assert(scope, "!" + FRAMEBUFFER_FUNC + "||" + FRAMEBUFFER, "invalid framebuffer object");
              });
              scope.set(FRAMEBUFFER_STATE, ".next", FRAMEBUFFER);
              var CONTEXT = shared.context;
              scope.set(CONTEXT, "." + S_FRAMEBUFFER_WIDTH, FRAMEBUFFER + "?" + FRAMEBUFFER + ".width:" + CONTEXT + "." + S_DRAWINGBUFFER_WIDTH);
              scope.set(CONTEXT, "." + S_FRAMEBUFFER_HEIGHT, FRAMEBUFFER + "?" + FRAMEBUFFER + ".height:" + CONTEXT + "." + S_DRAWINGBUFFER_HEIGHT);
              return FRAMEBUFFER;
            });
          } else {
            return null;
          }
        }
        function parseViewportScissor(options2, framebuffer, env) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          function parseBox(param) {
            if (param in staticOptions) {
              var box = staticOptions[param];
              check$1.commandType(box, "object", "invalid " + param, env.commandStr);
              var isStatic2 = true;
              var x = box.x | 0;
              var y = box.y | 0;
              var w, h;
              if ("width" in box) {
                w = box.width | 0;
                check$1.command(w >= 0, "invalid " + param, env.commandStr);
              } else {
                isStatic2 = false;
              }
              if ("height" in box) {
                h = box.height | 0;
                check$1.command(h >= 0, "invalid " + param, env.commandStr);
              } else {
                isStatic2 = false;
              }
              return new Declaration(!isStatic2 && framebuffer && framebuffer.thisDep, !isStatic2 && framebuffer && framebuffer.contextDep, !isStatic2 && framebuffer && framebuffer.propDep, function(env2, scope) {
                var CONTEXT = env2.shared.context;
                var BOX_W = w;
                if (!("width" in box)) {
                  BOX_W = scope.def(CONTEXT, ".", S_FRAMEBUFFER_WIDTH, "-", x);
                }
                var BOX_H = h;
                if (!("height" in box)) {
                  BOX_H = scope.def(CONTEXT, ".", S_FRAMEBUFFER_HEIGHT, "-", y);
                }
                return [x, y, BOX_W, BOX_H];
              });
            } else if (param in dynamicOptions) {
              var dynBox = dynamicOptions[param];
              var result = createDynamicDecl(dynBox, function(env2, scope) {
                var BOX = env2.invoke(scope, dynBox);
                check$1.optional(function() {
                  env2.assert(scope, BOX + "&&typeof " + BOX + '==="object"', "invalid " + param);
                });
                var CONTEXT = env2.shared.context;
                var BOX_X = scope.def(BOX, ".x|0");
                var BOX_Y = scope.def(BOX, ".y|0");
                var BOX_W = scope.def('"width" in ', BOX, "?", BOX, ".width|0:", "(", CONTEXT, ".", S_FRAMEBUFFER_WIDTH, "-", BOX_X, ")");
                var BOX_H = scope.def('"height" in ', BOX, "?", BOX, ".height|0:", "(", CONTEXT, ".", S_FRAMEBUFFER_HEIGHT, "-", BOX_Y, ")");
                check$1.optional(function() {
                  env2.assert(scope, BOX_W + ">=0&&" + BOX_H + ">=0", "invalid " + param);
                });
                return [BOX_X, BOX_Y, BOX_W, BOX_H];
              });
              if (framebuffer) {
                result.thisDep = result.thisDep || framebuffer.thisDep;
                result.contextDep = result.contextDep || framebuffer.contextDep;
                result.propDep = result.propDep || framebuffer.propDep;
              }
              return result;
            } else if (framebuffer) {
              return new Declaration(framebuffer.thisDep, framebuffer.contextDep, framebuffer.propDep, function(env2, scope) {
                var CONTEXT = env2.shared.context;
                return [
                  0,
                  0,
                  scope.def(CONTEXT, ".", S_FRAMEBUFFER_WIDTH),
                  scope.def(CONTEXT, ".", S_FRAMEBUFFER_HEIGHT)
                ];
              });
            } else {
              return null;
            }
          }
          var viewport = parseBox(S_VIEWPORT);
          if (viewport) {
            var prevViewport = viewport;
            viewport = new Declaration(viewport.thisDep, viewport.contextDep, viewport.propDep, function(env2, scope) {
              var VIEWPORT = prevViewport.append(env2, scope);
              var CONTEXT = env2.shared.context;
              scope.set(CONTEXT, "." + S_VIEWPORT_WIDTH, VIEWPORT[2]);
              scope.set(CONTEXT, "." + S_VIEWPORT_HEIGHT, VIEWPORT[3]);
              return VIEWPORT;
            });
          }
          return {
            viewport,
            scissor_box: parseBox(S_SCISSOR_BOX)
          };
        }
        function parseAttribLocations(options2, attributes) {
          var staticOptions = options2.static;
          var staticProgram = typeof staticOptions[S_FRAG] === "string" && typeof staticOptions[S_VERT] === "string";
          if (staticProgram) {
            if (Object.keys(attributes.dynamic).length > 0) {
              return null;
            }
            var staticAttributes = attributes.static;
            var sAttributes = Object.keys(staticAttributes);
            if (sAttributes.length > 0 && typeof staticAttributes[sAttributes[0]] === "number") {
              var bindings = [];
              for (var i = 0; i < sAttributes.length; ++i) {
                check$1(typeof staticAttributes[sAttributes[i]] === "number", "must specify all vertex attribute locations when using vaos");
                bindings.push([staticAttributes[sAttributes[i]] | 0, sAttributes[i]]);
              }
              return bindings;
            }
          }
          return null;
        }
        function parseProgram(options2, env, attribLocations) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          function parseShader(name) {
            if (name in staticOptions) {
              var id = stringStore.id(staticOptions[name]);
              check$1.optional(function() {
                shaderState.shader(shaderType[name], id, check$1.guessCommand());
              });
              var result = createStaticDecl(function() {
                return id;
              });
              result.id = id;
              return result;
            } else if (name in dynamicOptions) {
              var dyn = dynamicOptions[name];
              return createDynamicDecl(dyn, function(env2, scope) {
                var str = env2.invoke(scope, dyn);
                var id2 = scope.def(env2.shared.strings, ".id(", str, ")");
                check$1.optional(function() {
                  scope(env2.shared.shader, ".shader(", shaderType[name], ",", id2, ",", env2.command, ");");
                });
                return id2;
              });
            }
            return null;
          }
          var frag2 = parseShader(S_FRAG);
          var vert = parseShader(S_VERT);
          var program = null;
          var progVar;
          if (isStatic(frag2) && isStatic(vert)) {
            program = shaderState.program(vert.id, frag2.id, null, attribLocations);
            progVar = createStaticDecl(function(env2, scope) {
              return env2.link(program);
            });
          } else {
            progVar = new Declaration(frag2 && frag2.thisDep || vert && vert.thisDep, frag2 && frag2.contextDep || vert && vert.contextDep, frag2 && frag2.propDep || vert && vert.propDep, function(env2, scope) {
              var SHADER_STATE = env2.shared.shader;
              var fragId;
              if (frag2) {
                fragId = frag2.append(env2, scope);
              } else {
                fragId = scope.def(SHADER_STATE, ".", S_FRAG);
              }
              var vertId;
              if (vert) {
                vertId = vert.append(env2, scope);
              } else {
                vertId = scope.def(SHADER_STATE, ".", S_VERT);
              }
              var progDef = SHADER_STATE + ".program(" + vertId + "," + fragId;
              check$1.optional(function() {
                progDef += "," + env2.command;
              });
              return scope.def(progDef + ")");
            });
          }
          return {
            frag: frag2,
            vert,
            progVar,
            program
          };
        }
        function parseDraw(options2, env) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          var staticDraw = {};
          var vaoActive = false;
          function parseVAO() {
            if (S_VAO in staticOptions) {
              var vao2 = staticOptions[S_VAO];
              if (vao2 !== null && attributeState.getVAO(vao2) === null) {
                vao2 = attributeState.createVAO(vao2);
              }
              vaoActive = true;
              staticDraw.vao = vao2;
              return createStaticDecl(function(env2) {
                var vaoRef = attributeState.getVAO(vao2);
                if (vaoRef) {
                  return env2.link(vaoRef);
                } else {
                  return "null";
                }
              });
            } else if (S_VAO in dynamicOptions) {
              vaoActive = true;
              var dyn = dynamicOptions[S_VAO];
              return createDynamicDecl(dyn, function(env2, scope) {
                var vaoRef = env2.invoke(scope, dyn);
                return scope.def(env2.shared.vao + ".getVAO(" + vaoRef + ")");
              });
            }
            return null;
          }
          var vao = parseVAO();
          var elementsActive = false;
          function parseElements() {
            if (S_ELEMENTS in staticOptions) {
              var elements2 = staticOptions[S_ELEMENTS];
              staticDraw.elements = elements2;
              if (isBufferArgs(elements2)) {
                var e = staticDraw.elements = elementState.create(elements2, true);
                elements2 = elementState.getElements(e);
                elementsActive = true;
              } else if (elements2) {
                elements2 = elementState.getElements(elements2);
                elementsActive = true;
                check$1.command(elements2, "invalid elements", env.commandStr);
              }
              var result = createStaticDecl(function(env2, scope) {
                if (elements2) {
                  var result2 = env2.link(elements2);
                  env2.ELEMENTS = result2;
                  return result2;
                }
                env2.ELEMENTS = null;
                return null;
              });
              result.value = elements2;
              return result;
            } else if (S_ELEMENTS in dynamicOptions) {
              elementsActive = true;
              var dyn = dynamicOptions[S_ELEMENTS];
              return createDynamicDecl(dyn, function(env2, scope) {
                var shared = env2.shared;
                var IS_BUFFER_ARGS = shared.isBufferArgs;
                var ELEMENT_STATE = shared.elements;
                var elementDefn = env2.invoke(scope, dyn);
                var elements3 = scope.def("null");
                var elementStream = scope.def(IS_BUFFER_ARGS, "(", elementDefn, ")");
                var ifte = env2.cond(elementStream).then(elements3, "=", ELEMENT_STATE, ".createStream(", elementDefn, ");").else(elements3, "=", ELEMENT_STATE, ".getElements(", elementDefn, ");");
                check$1.optional(function() {
                  env2.assert(ifte.else, "!" + elementDefn + "||" + elements3, "invalid elements");
                });
                scope.entry(ifte);
                scope.exit(env2.cond(elementStream).then(ELEMENT_STATE, ".destroyStream(", elements3, ");"));
                env2.ELEMENTS = elements3;
                return elements3;
              });
            } else if (vaoActive) {
              return new Declaration(vao.thisDep, vao.contextDep, vao.propDep, function(env2, scope) {
                return scope.def(env2.shared.vao + ".currentVAO?" + env2.shared.elements + ".getElements(" + env2.shared.vao + ".currentVAO.elements):null");
              });
            }
            return null;
          }
          var elements = parseElements();
          function parsePrimitive() {
            if (S_PRIMITIVE in staticOptions) {
              var primitive2 = staticOptions[S_PRIMITIVE];
              staticDraw.primitive = primitive2;
              check$1.commandParameter(primitive2, primTypes, "invalid primitve", env.commandStr);
              return createStaticDecl(function(env2, scope) {
                return primTypes[primitive2];
              });
            } else if (S_PRIMITIVE in dynamicOptions) {
              var dynPrimitive = dynamicOptions[S_PRIMITIVE];
              return createDynamicDecl(dynPrimitive, function(env2, scope) {
                var PRIM_TYPES = env2.constants.primTypes;
                var prim = env2.invoke(scope, dynPrimitive);
                check$1.optional(function() {
                  env2.assert(scope, prim + " in " + PRIM_TYPES, "invalid primitive, must be one of " + Object.keys(primTypes));
                });
                return scope.def(PRIM_TYPES, "[", prim, "]");
              });
            } else if (elementsActive) {
              if (isStatic(elements)) {
                if (elements.value) {
                  return createStaticDecl(function(env2, scope) {
                    return scope.def(env2.ELEMENTS, ".primType");
                  });
                } else {
                  return createStaticDecl(function() {
                    return GL_TRIANGLES$1;
                  });
                }
              } else {
                return new Declaration(elements.thisDep, elements.contextDep, elements.propDep, function(env2, scope) {
                  var elements2 = env2.ELEMENTS;
                  return scope.def(elements2, "?", elements2, ".primType:", GL_TRIANGLES$1);
                });
              }
            } else if (vaoActive) {
              return new Declaration(vao.thisDep, vao.contextDep, vao.propDep, function(env2, scope) {
                return scope.def(env2.shared.vao + ".currentVAO?" + env2.shared.vao + ".currentVAO.primitive:" + GL_TRIANGLES$1);
              });
            }
            return null;
          }
          function parseParam(param, isOffset) {
            if (param in staticOptions) {
              var value = staticOptions[param] | 0;
              if (isOffset) {
                staticDraw.offset = value;
              } else {
                staticDraw.instances = value;
              }
              check$1.command(!isOffset || value >= 0, "invalid " + param, env.commandStr);
              return createStaticDecl(function(env2, scope) {
                if (isOffset) {
                  env2.OFFSET = value;
                }
                return value;
              });
            } else if (param in dynamicOptions) {
              var dynValue = dynamicOptions[param];
              return createDynamicDecl(dynValue, function(env2, scope) {
                var result = env2.invoke(scope, dynValue);
                if (isOffset) {
                  env2.OFFSET = result;
                  check$1.optional(function() {
                    env2.assert(scope, result + ">=0", "invalid " + param);
                  });
                }
                return result;
              });
            } else if (isOffset) {
              if (elementsActive) {
                return createStaticDecl(function(env2, scope) {
                  env2.OFFSET = 0;
                  return 0;
                });
              } else if (vaoActive) {
                return new Declaration(vao.thisDep, vao.contextDep, vao.propDep, function(env2, scope) {
                  return scope.def(env2.shared.vao + ".currentVAO?" + env2.shared.vao + ".currentVAO.offset:0");
                });
              }
            } else if (vaoActive) {
              return new Declaration(vao.thisDep, vao.contextDep, vao.propDep, function(env2, scope) {
                return scope.def(env2.shared.vao + ".currentVAO?" + env2.shared.vao + ".currentVAO.instances:-1");
              });
            }
            return null;
          }
          var OFFSET = parseParam(S_OFFSET, true);
          function parseVertCount() {
            if (S_COUNT in staticOptions) {
              var count2 = staticOptions[S_COUNT] | 0;
              staticDraw.count = count2;
              check$1.command(typeof count2 === "number" && count2 >= 0, "invalid vertex count", env.commandStr);
              return createStaticDecl(function() {
                return count2;
              });
            } else if (S_COUNT in dynamicOptions) {
              var dynCount = dynamicOptions[S_COUNT];
              return createDynamicDecl(dynCount, function(env2, scope) {
                var result2 = env2.invoke(scope, dynCount);
                check$1.optional(function() {
                  env2.assert(scope, "typeof " + result2 + '==="number"&&' + result2 + ">=0&&" + result2 + "===(" + result2 + "|0)", "invalid vertex count");
                });
                return result2;
              });
            } else if (elementsActive) {
              if (isStatic(elements)) {
                if (elements) {
                  if (OFFSET) {
                    return new Declaration(OFFSET.thisDep, OFFSET.contextDep, OFFSET.propDep, function(env2, scope) {
                      var result2 = scope.def(env2.ELEMENTS, ".vertCount-", env2.OFFSET);
                      check$1.optional(function() {
                        env2.assert(scope, result2 + ">=0", "invalid vertex offset/element buffer too small");
                      });
                      return result2;
                    });
                  } else {
                    return createStaticDecl(function(env2, scope) {
                      return scope.def(env2.ELEMENTS, ".vertCount");
                    });
                  }
                } else {
                  var result = createStaticDecl(function() {
                    return -1;
                  });
                  check$1.optional(function() {
                    result.MISSING = true;
                  });
                  return result;
                }
              } else {
                var variable = new Declaration(elements.thisDep || OFFSET.thisDep, elements.contextDep || OFFSET.contextDep, elements.propDep || OFFSET.propDep, function(env2, scope) {
                  var elements2 = env2.ELEMENTS;
                  if (env2.OFFSET) {
                    return scope.def(elements2, "?", elements2, ".vertCount-", env2.OFFSET, ":-1");
                  }
                  return scope.def(elements2, "?", elements2, ".vertCount:-1");
                });
                check$1.optional(function() {
                  variable.DYNAMIC = true;
                });
                return variable;
              }
            } else if (vaoActive) {
              var countVariable = new Declaration(vao.thisDep, vao.contextDep, vao.propDep, function(env2, scope) {
                return scope.def(env2.shared.vao, ".currentVAO?", env2.shared.vao, ".currentVAO.count:-1");
              });
              return countVariable;
            }
            return null;
          }
          var primitive = parsePrimitive();
          var count = parseVertCount();
          var instances = parseParam(S_INSTANCES, false);
          return {
            elements,
            primitive,
            count,
            instances,
            offset: OFFSET,
            vao,
            vaoActive,
            elementsActive,
            static: staticDraw
          };
        }
        function parseGLState(options2, env) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          var STATE = {};
          GL_STATE_NAMES.forEach(function(prop) {
            var param = propName(prop);
            function parseParam(parseStatic, parseDynamic) {
              if (prop in staticOptions) {
                var value = parseStatic(staticOptions[prop]);
                STATE[param] = createStaticDecl(function() {
                  return value;
                });
              } else if (prop in dynamicOptions) {
                var dyn = dynamicOptions[prop];
                STATE[param] = createDynamicDecl(dyn, function(env2, scope) {
                  return parseDynamic(env2, scope, env2.invoke(scope, dyn));
                });
              }
            }
            switch (prop) {
              case S_CULL_ENABLE:
              case S_BLEND_ENABLE:
              case S_DITHER:
              case S_STENCIL_ENABLE:
              case S_DEPTH_ENABLE:
              case S_SCISSOR_ENABLE:
              case S_POLYGON_OFFSET_ENABLE:
              case S_SAMPLE_ALPHA:
              case S_SAMPLE_ENABLE:
              case S_DEPTH_MASK:
                return parseParam(function(value) {
                  check$1.commandType(value, "boolean", prop, env.commandStr);
                  return value;
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, "typeof " + value + '==="boolean"', "invalid flag " + prop, env2.commandStr);
                  });
                  return value;
                });
              case S_DEPTH_FUNC:
                return parseParam(function(value) {
                  check$1.commandParameter(value, compareFuncs, "invalid " + prop, env.commandStr);
                  return compareFuncs[value];
                }, function(env2, scope, value) {
                  var COMPARE_FUNCS = env2.constants.compareFuncs;
                  check$1.optional(function() {
                    env2.assert(scope, value + " in " + COMPARE_FUNCS, "invalid " + prop + ", must be one of " + Object.keys(compareFuncs));
                  });
                  return scope.def(COMPARE_FUNCS, "[", value, "]");
                });
              case S_DEPTH_RANGE:
                return parseParam(function(value) {
                  check$1.command(isArrayLike(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number" && value[0] <= value[1], "depth range is 2d array", env.commandStr);
                  return value;
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, env2.shared.isArrayLike + "(" + value + ")&&" + value + ".length===2&&typeof " + value + '[0]==="number"&&typeof ' + value + '[1]==="number"&&' + value + "[0]<=" + value + "[1]", "depth range must be a 2d array");
                  });
                  var Z_NEAR = scope.def("+", value, "[0]");
                  var Z_FAR = scope.def("+", value, "[1]");
                  return [Z_NEAR, Z_FAR];
                });
              case S_BLEND_FUNC:
                return parseParam(function(value) {
                  check$1.commandType(value, "object", "blend.func", env.commandStr);
                  var srcRGB = "srcRGB" in value ? value.srcRGB : value.src;
                  var srcAlpha = "srcAlpha" in value ? value.srcAlpha : value.src;
                  var dstRGB = "dstRGB" in value ? value.dstRGB : value.dst;
                  var dstAlpha = "dstAlpha" in value ? value.dstAlpha : value.dst;
                  check$1.commandParameter(srcRGB, blendFuncs, param + ".srcRGB", env.commandStr);
                  check$1.commandParameter(srcAlpha, blendFuncs, param + ".srcAlpha", env.commandStr);
                  check$1.commandParameter(dstRGB, blendFuncs, param + ".dstRGB", env.commandStr);
                  check$1.commandParameter(dstAlpha, blendFuncs, param + ".dstAlpha", env.commandStr);
                  check$1.command(invalidBlendCombinations.indexOf(srcRGB + ", " + dstRGB) === -1, "unallowed blending combination (srcRGB, dstRGB) = (" + srcRGB + ", " + dstRGB + ")", env.commandStr);
                  return [
                    blendFuncs[srcRGB],
                    blendFuncs[dstRGB],
                    blendFuncs[srcAlpha],
                    blendFuncs[dstAlpha]
                  ];
                }, function(env2, scope, value) {
                  var BLEND_FUNCS = env2.constants.blendFuncs;
                  check$1.optional(function() {
                    env2.assert(scope, value + "&&typeof " + value + '==="object"', "invalid blend func, must be an object");
                  });
                  function read2(prefix, suffix) {
                    var func = scope.def('"', prefix, suffix, '" in ', value, "?", value, ".", prefix, suffix, ":", value, ".", prefix);
                    check$1.optional(function() {
                      env2.assert(scope, func + " in " + BLEND_FUNCS, "invalid " + prop + "." + prefix + suffix + ", must be one of " + Object.keys(blendFuncs));
                    });
                    return func;
                  }
                  var srcRGB = read2("src", "RGB");
                  var dstRGB = read2("dst", "RGB");
                  check$1.optional(function() {
                    var INVALID_BLEND_COMBINATIONS = env2.constants.invalidBlendCombinations;
                    env2.assert(scope, INVALID_BLEND_COMBINATIONS + ".indexOf(" + srcRGB + '+", "+' + dstRGB + ") === -1 ", "unallowed blending combination for (srcRGB, dstRGB)");
                  });
                  var SRC_RGB = scope.def(BLEND_FUNCS, "[", srcRGB, "]");
                  var SRC_ALPHA = scope.def(BLEND_FUNCS, "[", read2("src", "Alpha"), "]");
                  var DST_RGB = scope.def(BLEND_FUNCS, "[", dstRGB, "]");
                  var DST_ALPHA = scope.def(BLEND_FUNCS, "[", read2("dst", "Alpha"), "]");
                  return [SRC_RGB, DST_RGB, SRC_ALPHA, DST_ALPHA];
                });
              case S_BLEND_EQUATION:
                return parseParam(function(value) {
                  if (typeof value === "string") {
                    check$1.commandParameter(value, blendEquations, "invalid " + prop, env.commandStr);
                    return [
                      blendEquations[value],
                      blendEquations[value]
                    ];
                  } else if (typeof value === "object") {
                    check$1.commandParameter(value.rgb, blendEquations, prop + ".rgb", env.commandStr);
                    check$1.commandParameter(value.alpha, blendEquations, prop + ".alpha", env.commandStr);
                    return [
                      blendEquations[value.rgb],
                      blendEquations[value.alpha]
                    ];
                  } else {
                    check$1.commandRaise("invalid blend.equation", env.commandStr);
                  }
                }, function(env2, scope, value) {
                  var BLEND_EQUATIONS = env2.constants.blendEquations;
                  var RGB = scope.def();
                  var ALPHA = scope.def();
                  var ifte = env2.cond("typeof ", value, '==="string"');
                  check$1.optional(function() {
                    function checkProp(block, name, value2) {
                      env2.assert(block, value2 + " in " + BLEND_EQUATIONS, "invalid " + name + ", must be one of " + Object.keys(blendEquations));
                    }
                    checkProp(ifte.then, prop, value);
                    env2.assert(ifte.else, value + "&&typeof " + value + '==="object"', "invalid " + prop);
                    checkProp(ifte.else, prop + ".rgb", value + ".rgb");
                    checkProp(ifte.else, prop + ".alpha", value + ".alpha");
                  });
                  ifte.then(RGB, "=", ALPHA, "=", BLEND_EQUATIONS, "[", value, "];");
                  ifte.else(RGB, "=", BLEND_EQUATIONS, "[", value, ".rgb];", ALPHA, "=", BLEND_EQUATIONS, "[", value, ".alpha];");
                  scope(ifte);
                  return [RGB, ALPHA];
                });
              case S_BLEND_COLOR:
                return parseParam(function(value) {
                  check$1.command(isArrayLike(value) && value.length === 4, "blend.color must be a 4d array", env.commandStr);
                  return loop(4, function(i) {
                    return +value[i];
                  });
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, env2.shared.isArrayLike + "(" + value + ")&&" + value + ".length===4", "blend.color must be a 4d array");
                  });
                  return loop(4, function(i) {
                    return scope.def("+", value, "[", i, "]");
                  });
                });
              case S_STENCIL_MASK:
                return parseParam(function(value) {
                  check$1.commandType(value, "number", param, env.commandStr);
                  return value | 0;
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, "typeof " + value + '==="number"', "invalid stencil.mask");
                  });
                  return scope.def(value, "|0");
                });
              case S_STENCIL_FUNC:
                return parseParam(function(value) {
                  check$1.commandType(value, "object", param, env.commandStr);
                  var cmp = value.cmp || "keep";
                  var ref = value.ref || 0;
                  var mask = "mask" in value ? value.mask : -1;
                  check$1.commandParameter(cmp, compareFuncs, prop + ".cmp", env.commandStr);
                  check$1.commandType(ref, "number", prop + ".ref", env.commandStr);
                  check$1.commandType(mask, "number", prop + ".mask", env.commandStr);
                  return [
                    compareFuncs[cmp],
                    ref,
                    mask
                  ];
                }, function(env2, scope, value) {
                  var COMPARE_FUNCS = env2.constants.compareFuncs;
                  check$1.optional(function() {
                    function assert() {
                      env2.assert(scope, Array.prototype.join.call(arguments, ""), "invalid stencil.func");
                    }
                    assert(value + "&&typeof ", value, '==="object"');
                    assert('!("cmp" in ', value, ")||(", value, ".cmp in ", COMPARE_FUNCS, ")");
                  });
                  var cmp = scope.def('"cmp" in ', value, "?", COMPARE_FUNCS, "[", value, ".cmp]", ":", GL_KEEP);
                  var ref = scope.def(value, ".ref|0");
                  var mask = scope.def('"mask" in ', value, "?", value, ".mask|0:-1");
                  return [cmp, ref, mask];
                });
              case S_STENCIL_OPFRONT:
              case S_STENCIL_OPBACK:
                return parseParam(function(value) {
                  check$1.commandType(value, "object", param, env.commandStr);
                  var fail = value.fail || "keep";
                  var zfail = value.zfail || "keep";
                  var zpass = value.zpass || "keep";
                  check$1.commandParameter(fail, stencilOps, prop + ".fail", env.commandStr);
                  check$1.commandParameter(zfail, stencilOps, prop + ".zfail", env.commandStr);
                  check$1.commandParameter(zpass, stencilOps, prop + ".zpass", env.commandStr);
                  return [
                    prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                    stencilOps[fail],
                    stencilOps[zfail],
                    stencilOps[zpass]
                  ];
                }, function(env2, scope, value) {
                  var STENCIL_OPS = env2.constants.stencilOps;
                  check$1.optional(function() {
                    env2.assert(scope, value + "&&typeof " + value + '==="object"', "invalid " + prop);
                  });
                  function read2(name) {
                    check$1.optional(function() {
                      env2.assert(scope, '!("' + name + '" in ' + value + ")||(" + value + "." + name + " in " + STENCIL_OPS + ")", "invalid " + prop + "." + name + ", must be one of " + Object.keys(stencilOps));
                    });
                    return scope.def('"', name, '" in ', value, "?", STENCIL_OPS, "[", value, ".", name, "]:", GL_KEEP);
                  }
                  return [
                    prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                    read2("fail"),
                    read2("zfail"),
                    read2("zpass")
                  ];
                });
              case S_POLYGON_OFFSET_OFFSET:
                return parseParam(function(value) {
                  check$1.commandType(value, "object", param, env.commandStr);
                  var factor = value.factor | 0;
                  var units = value.units | 0;
                  check$1.commandType(factor, "number", param + ".factor", env.commandStr);
                  check$1.commandType(units, "number", param + ".units", env.commandStr);
                  return [factor, units];
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, value + "&&typeof " + value + '==="object"', "invalid " + prop);
                  });
                  var FACTOR = scope.def(value, ".factor|0");
                  var UNITS = scope.def(value, ".units|0");
                  return [FACTOR, UNITS];
                });
              case S_CULL_FACE:
                return parseParam(function(value) {
                  var face = 0;
                  if (value === "front") {
                    face = GL_FRONT;
                  } else if (value === "back") {
                    face = GL_BACK;
                  }
                  check$1.command(!!face, param, env.commandStr);
                  return face;
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, value + '==="front"||' + value + '==="back"', "invalid cull.face");
                  });
                  return scope.def(value, '==="front"?', GL_FRONT, ":", GL_BACK);
                });
              case S_LINE_WIDTH:
                return parseParam(function(value) {
                  check$1.command(typeof value === "number" && value >= limits.lineWidthDims[0] && value <= limits.lineWidthDims[1], "invalid line width, must be a positive number between " + limits.lineWidthDims[0] + " and " + limits.lineWidthDims[1], env.commandStr);
                  return value;
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, "typeof " + value + '==="number"&&' + value + ">=" + limits.lineWidthDims[0] + "&&" + value + "<=" + limits.lineWidthDims[1], "invalid line width");
                  });
                  return value;
                });
              case S_FRONT_FACE:
                return parseParam(function(value) {
                  check$1.commandParameter(value, orientationType, param, env.commandStr);
                  return orientationType[value];
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, value + '==="cw"||' + value + '==="ccw"', "invalid frontFace, must be one of cw,ccw");
                  });
                  return scope.def(value + '==="cw"?' + GL_CW + ":" + GL_CCW);
                });
              case S_COLOR_MASK:
                return parseParam(function(value) {
                  check$1.command(isArrayLike(value) && value.length === 4, "color.mask must be length 4 array", env.commandStr);
                  return value.map(function(v) {
                    return !!v;
                  });
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, env2.shared.isArrayLike + "(" + value + ")&&" + value + ".length===4", "invalid color.mask");
                  });
                  return loop(4, function(i) {
                    return "!!" + value + "[" + i + "]";
                  });
                });
              case S_SAMPLE_COVERAGE:
                return parseParam(function(value) {
                  check$1.command(typeof value === "object" && value, param, env.commandStr);
                  var sampleValue = "value" in value ? value.value : 1;
                  var sampleInvert = !!value.invert;
                  check$1.command(typeof sampleValue === "number" && sampleValue >= 0 && sampleValue <= 1, "sample.coverage.value must be a number between 0 and 1", env.commandStr);
                  return [sampleValue, sampleInvert];
                }, function(env2, scope, value) {
                  check$1.optional(function() {
                    env2.assert(scope, value + "&&typeof " + value + '==="object"', "invalid sample.coverage");
                  });
                  var VALUE = scope.def('"value" in ', value, "?+", value, ".value:1");
                  var INVERT = scope.def("!!", value, ".invert");
                  return [VALUE, INVERT];
                });
            }
          });
          return STATE;
        }
        function parseUniforms(uniforms, env) {
          var staticUniforms = uniforms.static;
          var dynamicUniforms = uniforms.dynamic;
          var UNIFORMS = {};
          Object.keys(staticUniforms).forEach(function(name) {
            var value = staticUniforms[name];
            var result;
            if (typeof value === "number" || typeof value === "boolean") {
              result = createStaticDecl(function() {
                return value;
              });
            } else if (typeof value === "function") {
              var reglType = value._reglType;
              if (reglType === "texture2d" || reglType === "textureCube") {
                result = createStaticDecl(function(env2) {
                  return env2.link(value);
                });
              } else if (reglType === "framebuffer" || reglType === "framebufferCube") {
                check$1.command(value.color.length > 0, 'missing color attachment for framebuffer sent to uniform "' + name + '"', env.commandStr);
                result = createStaticDecl(function(env2) {
                  return env2.link(value.color[0]);
                });
              } else {
                check$1.commandRaise('invalid data for uniform "' + name + '"', env.commandStr);
              }
            } else if (isArrayLike(value)) {
              result = createStaticDecl(function(env2) {
                var ITEM = env2.global.def("[", loop(value.length, function(i) {
                  check$1.command(typeof value[i] === "number" || typeof value[i] === "boolean", "invalid uniform " + name, env2.commandStr);
                  return value[i];
                }), "]");
                return ITEM;
              });
            } else {
              check$1.commandRaise('invalid or missing data for uniform "' + name + '"', env.commandStr);
            }
            result.value = value;
            UNIFORMS[name] = result;
          });
          Object.keys(dynamicUniforms).forEach(function(key) {
            var dyn = dynamicUniforms[key];
            UNIFORMS[key] = createDynamicDecl(dyn, function(env2, scope) {
              return env2.invoke(scope, dyn);
            });
          });
          return UNIFORMS;
        }
        function parseAttributes(attributes, env) {
          var staticAttributes = attributes.static;
          var dynamicAttributes = attributes.dynamic;
          var attributeDefs = {};
          Object.keys(staticAttributes).forEach(function(attribute) {
            var value = staticAttributes[attribute];
            var id = stringStore.id(attribute);
            var record = new AttributeRecord2();
            if (isBufferArgs(value)) {
              record.state = ATTRIB_STATE_POINTER;
              record.buffer = bufferState.getBuffer(bufferState.create(value, GL_ARRAY_BUFFER$2, false, true));
              record.type = 0;
            } else {
              var buffer = bufferState.getBuffer(value);
              if (buffer) {
                record.state = ATTRIB_STATE_POINTER;
                record.buffer = buffer;
                record.type = 0;
              } else {
                check$1.command(typeof value === "object" && value, "invalid data for attribute " + attribute, env.commandStr);
                if ("constant" in value) {
                  var constant = value.constant;
                  record.buffer = "null";
                  record.state = ATTRIB_STATE_CONSTANT;
                  if (typeof constant === "number") {
                    record.x = constant;
                  } else {
                    check$1.command(isArrayLike(constant) && constant.length > 0 && constant.length <= 4, "invalid constant for attribute " + attribute, env.commandStr);
                    CUTE_COMPONENTS.forEach(function(c, i) {
                      if (i < constant.length) {
                        record[c] = constant[i];
                      }
                    });
                  }
                } else {
                  if (isBufferArgs(value.buffer)) {
                    buffer = bufferState.getBuffer(bufferState.create(value.buffer, GL_ARRAY_BUFFER$2, false, true));
                  } else {
                    buffer = bufferState.getBuffer(value.buffer);
                  }
                  check$1.command(!!buffer, 'missing buffer for attribute "' + attribute + '"', env.commandStr);
                  var offset = value.offset | 0;
                  check$1.command(offset >= 0, 'invalid offset for attribute "' + attribute + '"', env.commandStr);
                  var stride = value.stride | 0;
                  check$1.command(stride >= 0 && stride < 256, 'invalid stride for attribute "' + attribute + '", must be integer betweeen [0, 255]', env.commandStr);
                  var size = value.size | 0;
                  check$1.command(!("size" in value) || size > 0 && size <= 4, 'invalid size for attribute "' + attribute + '", must be 1,2,3,4', env.commandStr);
                  var normalized = !!value.normalized;
                  var type = 0;
                  if ("type" in value) {
                    check$1.commandParameter(value.type, glTypes, "invalid type for attribute " + attribute, env.commandStr);
                    type = glTypes[value.type];
                  }
                  var divisor = value.divisor | 0;
                  check$1.optional(function() {
                    if ("divisor" in value) {
                      check$1.command(divisor === 0 || extInstancing, 'cannot specify divisor for attribute "' + attribute + '", instancing not supported', env.commandStr);
                      check$1.command(divisor >= 0, 'invalid divisor for attribute "' + attribute + '"', env.commandStr);
                    }
                    var command = env.commandStr;
                    var VALID_KEYS = [
                      "buffer",
                      "offset",
                      "divisor",
                      "normalized",
                      "type",
                      "size",
                      "stride"
                    ];
                    Object.keys(value).forEach(function(prop) {
                      check$1.command(VALID_KEYS.indexOf(prop) >= 0, 'unknown parameter "' + prop + '" for attribute pointer "' + attribute + '" (valid parameters are ' + VALID_KEYS + ")", command);
                    });
                  });
                  record.buffer = buffer;
                  record.state = ATTRIB_STATE_POINTER;
                  record.size = size;
                  record.normalized = normalized;
                  record.type = type || buffer.dtype;
                  record.offset = offset;
                  record.stride = stride;
                  record.divisor = divisor;
                }
              }
            }
            attributeDefs[attribute] = createStaticDecl(function(env2, scope) {
              var cache = env2.attribCache;
              if (id in cache) {
                return cache[id];
              }
              var result = {
                isStream: false
              };
              Object.keys(record).forEach(function(key) {
                result[key] = record[key];
              });
              if (record.buffer) {
                result.buffer = env2.link(record.buffer);
                result.type = result.type || result.buffer + ".dtype";
              }
              cache[id] = result;
              return result;
            });
          });
          Object.keys(dynamicAttributes).forEach(function(attribute) {
            var dyn = dynamicAttributes[attribute];
            function appendAttributeCode(env2, block) {
              var VALUE = env2.invoke(block, dyn);
              var shared = env2.shared;
              var constants = env2.constants;
              var IS_BUFFER_ARGS = shared.isBufferArgs;
              var BUFFER_STATE = shared.buffer;
              check$1.optional(function() {
                env2.assert(block, VALUE + "&&(typeof " + VALUE + '==="object"||typeof ' + VALUE + '==="function")&&(' + IS_BUFFER_ARGS + "(" + VALUE + ")||" + BUFFER_STATE + ".getBuffer(" + VALUE + ")||" + BUFFER_STATE + ".getBuffer(" + VALUE + ".buffer)||" + IS_BUFFER_ARGS + "(" + VALUE + '.buffer)||("constant" in ' + VALUE + "&&(typeof " + VALUE + '.constant==="number"||' + shared.isArrayLike + "(" + VALUE + ".constant))))", 'invalid dynamic attribute "' + attribute + '"');
              });
              var result = {
                isStream: block.def(false)
              };
              var defaultRecord = new AttributeRecord2();
              defaultRecord.state = ATTRIB_STATE_POINTER;
              Object.keys(defaultRecord).forEach(function(key) {
                result[key] = block.def("" + defaultRecord[key]);
              });
              var BUFFER = result.buffer;
              var TYPE = result.type;
              block("if(", IS_BUFFER_ARGS, "(", VALUE, ")){", result.isStream, "=true;", BUFFER, "=", BUFFER_STATE, ".createStream(", GL_ARRAY_BUFFER$2, ",", VALUE, ");", TYPE, "=", BUFFER, ".dtype;", "}else{", BUFFER, "=", BUFFER_STATE, ".getBuffer(", VALUE, ");", "if(", BUFFER, "){", TYPE, "=", BUFFER, ".dtype;", '}else if("constant" in ', VALUE, "){", result.state, "=", ATTRIB_STATE_CONSTANT, ";", "if(typeof " + VALUE + '.constant === "number"){', result[CUTE_COMPONENTS[0]], "=", VALUE, ".constant;", CUTE_COMPONENTS.slice(1).map(function(n) {
                return result[n];
              }).join("="), "=0;", "}else{", CUTE_COMPONENTS.map(function(name, i) {
                return result[name] + "=" + VALUE + ".constant.length>" + i + "?" + VALUE + ".constant[" + i + "]:0;";
              }).join(""), "}}else{", "if(", IS_BUFFER_ARGS, "(", VALUE, ".buffer)){", BUFFER, "=", BUFFER_STATE, ".createStream(", GL_ARRAY_BUFFER$2, ",", VALUE, ".buffer);", "}else{", BUFFER, "=", BUFFER_STATE, ".getBuffer(", VALUE, ".buffer);", "}", TYPE, '="type" in ', VALUE, "?", constants.glTypes, "[", VALUE, ".type]:", BUFFER, ".dtype;", result.normalized, "=!!", VALUE, ".normalized;");
              function emitReadRecord(name) {
                block(result[name], "=", VALUE, ".", name, "|0;");
              }
              emitReadRecord("size");
              emitReadRecord("offset");
              emitReadRecord("stride");
              emitReadRecord("divisor");
              block("}}");
              block.exit("if(", result.isStream, "){", BUFFER_STATE, ".destroyStream(", BUFFER, ");", "}");
              return result;
            }
            attributeDefs[attribute] = createDynamicDecl(dyn, appendAttributeCode);
          });
          return attributeDefs;
        }
        function parseContext(context) {
          var staticContext = context.static;
          var dynamicContext = context.dynamic;
          var result = {};
          Object.keys(staticContext).forEach(function(name) {
            var value = staticContext[name];
            result[name] = createStaticDecl(function(env, scope) {
              if (typeof value === "number" || typeof value === "boolean") {
                return "" + value;
              } else {
                return env.link(value);
              }
            });
          });
          Object.keys(dynamicContext).forEach(function(name) {
            var dyn = dynamicContext[name];
            result[name] = createDynamicDecl(dyn, function(env, scope) {
              return env.invoke(scope, dyn);
            });
          });
          return result;
        }
        function parseArguments(options2, attributes, uniforms, context, env) {
          var staticOptions = options2.static;
          var dynamicOptions = options2.dynamic;
          check$1.optional(function() {
            var KEY_NAMES = [
              S_FRAMEBUFFER,
              S_VERT,
              S_FRAG,
              S_ELEMENTS,
              S_PRIMITIVE,
              S_OFFSET,
              S_COUNT,
              S_INSTANCES,
              S_PROFILE,
              S_VAO
            ].concat(GL_STATE_NAMES);
            function checkKeys(dict) {
              Object.keys(dict).forEach(function(key) {
                check$1.command(KEY_NAMES.indexOf(key) >= 0, 'unknown parameter "' + key + '"', env.commandStr);
              });
            }
            checkKeys(staticOptions);
            checkKeys(dynamicOptions);
          });
          var attribLocations = parseAttribLocations(options2, attributes);
          var framebuffer = parseFramebuffer(options2, env);
          var viewportAndScissor = parseViewportScissor(options2, framebuffer, env);
          var draw = parseDraw(options2, env);
          var state = parseGLState(options2, env);
          var shader2 = parseProgram(options2, env, attribLocations);
          function copyBox(name) {
            var defn = viewportAndScissor[name];
            if (defn) {
              state[name] = defn;
            }
          }
          copyBox(S_VIEWPORT);
          copyBox(propName(S_SCISSOR_BOX));
          var dirty = Object.keys(state).length > 0;
          var result = {
            framebuffer,
            draw,
            shader: shader2,
            state,
            dirty,
            scopeVAO: null,
            drawVAO: null,
            useVAO: false,
            attributes: {}
          };
          result.profile = parseProfile(options2, env);
          result.uniforms = parseUniforms(uniforms, env);
          result.drawVAO = result.scopeVAO = draw.vao;
          if (!result.drawVAO && shader2.program && !attribLocations && extensions.angle_instanced_arrays && draw.static.elements) {
            var useVAO = true;
            var staticBindings = shader2.program.attributes.map(function(attr) {
              var binding = attributes.static[attr];
              useVAO = useVAO && !!binding;
              return binding;
            });
            if (useVAO && staticBindings.length > 0) {
              var vao = attributeState.getVAO(attributeState.createVAO({
                attributes: staticBindings,
                elements: draw.static.elements
              }));
              result.drawVAO = new Declaration(null, null, null, function(env2, scope) {
                return env2.link(vao);
              });
              result.useVAO = true;
            }
          }
          if (attribLocations) {
            result.useVAO = true;
          } else {
            result.attributes = parseAttributes(attributes, env);
          }
          result.context = parseContext(context, env);
          return result;
        }
        function emitContext(env, scope, context) {
          var shared = env.shared;
          var CONTEXT = shared.context;
          var contextEnter = env.scope();
          Object.keys(context).forEach(function(name) {
            scope.save(CONTEXT, "." + name);
            var defn = context[name];
            var value = defn.append(env, scope);
            if (Array.isArray(value)) {
              contextEnter(CONTEXT, ".", name, "=[", value.join(), "];");
            } else {
              contextEnter(CONTEXT, ".", name, "=", value, ";");
            }
          });
          scope(contextEnter);
        }
        function emitPollFramebuffer(env, scope, framebuffer, skipCheck) {
          var shared = env.shared;
          var GL = shared.gl;
          var FRAMEBUFFER_STATE = shared.framebuffer;
          var EXT_DRAW_BUFFERS;
          if (extDrawBuffers) {
            EXT_DRAW_BUFFERS = scope.def(shared.extensions, ".webgl_draw_buffers");
          }
          var constants = env.constants;
          var DRAW_BUFFERS = constants.drawBuffer;
          var BACK_BUFFER = constants.backBuffer;
          var NEXT;
          if (framebuffer) {
            NEXT = framebuffer.append(env, scope);
          } else {
            NEXT = scope.def(FRAMEBUFFER_STATE, ".next");
          }
          if (!skipCheck) {
            scope("if(", NEXT, "!==", FRAMEBUFFER_STATE, ".cur){");
          }
          scope("if(", NEXT, "){", GL, ".bindFramebuffer(", GL_FRAMEBUFFER$2, ",", NEXT, ".framebuffer);");
          if (extDrawBuffers) {
            scope(EXT_DRAW_BUFFERS, ".drawBuffersWEBGL(", DRAW_BUFFERS, "[", NEXT, ".colorAttachments.length]);");
          }
          scope("}else{", GL, ".bindFramebuffer(", GL_FRAMEBUFFER$2, ",null);");
          if (extDrawBuffers) {
            scope(EXT_DRAW_BUFFERS, ".drawBuffersWEBGL(", BACK_BUFFER, ");");
          }
          scope("}", FRAMEBUFFER_STATE, ".cur=", NEXT, ";");
          if (!skipCheck) {
            scope("}");
          }
        }
        function emitPollState(env, scope, args) {
          var shared = env.shared;
          var GL = shared.gl;
          var CURRENT_VARS = env.current;
          var NEXT_VARS = env.next;
          var CURRENT_STATE = shared.current;
          var NEXT_STATE = shared.next;
          var block = env.cond(CURRENT_STATE, ".dirty");
          GL_STATE_NAMES.forEach(function(prop) {
            var param = propName(prop);
            if (param in args.state) {
              return;
            }
            var NEXT, CURRENT;
            if (param in NEXT_VARS) {
              NEXT = NEXT_VARS[param];
              CURRENT = CURRENT_VARS[param];
              var parts = loop(currentState[param].length, function(i) {
                return block.def(NEXT, "[", i, "]");
              });
              block(env.cond(parts.map(function(p, i) {
                return p + "!==" + CURRENT + "[" + i + "]";
              }).join("||")).then(GL, ".", GL_VARIABLES[param], "(", parts, ");", parts.map(function(p, i) {
                return CURRENT + "[" + i + "]=" + p;
              }).join(";"), ";"));
            } else {
              NEXT = block.def(NEXT_STATE, ".", param);
              var ifte = env.cond(NEXT, "!==", CURRENT_STATE, ".", param);
              block(ifte);
              if (param in GL_FLAGS) {
                ifte(env.cond(NEXT).then(GL, ".enable(", GL_FLAGS[param], ");").else(GL, ".disable(", GL_FLAGS[param], ");"), CURRENT_STATE, ".", param, "=", NEXT, ";");
              } else {
                ifte(GL, ".", GL_VARIABLES[param], "(", NEXT, ");", CURRENT_STATE, ".", param, "=", NEXT, ";");
              }
            }
          });
          if (Object.keys(args.state).length === 0) {
            block(CURRENT_STATE, ".dirty=false;");
          }
          scope(block);
        }
        function emitSetOptions(env, scope, options2, filter) {
          var shared = env.shared;
          var CURRENT_VARS = env.current;
          var CURRENT_STATE = shared.current;
          var GL = shared.gl;
          sortState(Object.keys(options2)).forEach(function(param) {
            var defn = options2[param];
            if (filter && !filter(defn)) {
              return;
            }
            var variable = defn.append(env, scope);
            if (GL_FLAGS[param]) {
              var flag = GL_FLAGS[param];
              if (isStatic(defn)) {
                if (variable) {
                  scope(GL, ".enable(", flag, ");");
                } else {
                  scope(GL, ".disable(", flag, ");");
                }
              } else {
                scope(env.cond(variable).then(GL, ".enable(", flag, ");").else(GL, ".disable(", flag, ");"));
              }
              scope(CURRENT_STATE, ".", param, "=", variable, ";");
            } else if (isArrayLike(variable)) {
              var CURRENT = CURRENT_VARS[param];
              scope(GL, ".", GL_VARIABLES[param], "(", variable, ");", variable.map(function(v, i) {
                return CURRENT + "[" + i + "]=" + v;
              }).join(";"), ";");
            } else {
              scope(GL, ".", GL_VARIABLES[param], "(", variable, ");", CURRENT_STATE, ".", param, "=", variable, ";");
            }
          });
        }
        function injectExtensions(env, scope) {
          if (extInstancing) {
            env.instancing = scope.def(env.shared.extensions, ".angle_instanced_arrays");
          }
        }
        function emitProfile(env, scope, args, useScope, incrementCounter) {
          var shared = env.shared;
          var STATS = env.stats;
          var CURRENT_STATE = shared.current;
          var TIMER = shared.timer;
          var profileArg = args.profile;
          function perfCounter() {
            if (typeof performance === "undefined") {
              return "Date.now()";
            } else {
              return "performance.now()";
            }
          }
          var CPU_START, QUERY_COUNTER;
          function emitProfileStart(block) {
            CPU_START = scope.def();
            block(CPU_START, "=", perfCounter(), ";");
            if (typeof incrementCounter === "string") {
              block(STATS, ".count+=", incrementCounter, ";");
            } else {
              block(STATS, ".count++;");
            }
            if (timer) {
              if (useScope) {
                QUERY_COUNTER = scope.def();
                block(QUERY_COUNTER, "=", TIMER, ".getNumPendingQueries();");
              } else {
                block(TIMER, ".beginQuery(", STATS, ");");
              }
            }
          }
          function emitProfileEnd(block) {
            block(STATS, ".cpuTime+=", perfCounter(), "-", CPU_START, ";");
            if (timer) {
              if (useScope) {
                block(TIMER, ".pushScopeStats(", QUERY_COUNTER, ",", TIMER, ".getNumPendingQueries(),", STATS, ");");
              } else {
                block(TIMER, ".endQuery();");
              }
            }
          }
          function scopeProfile(value) {
            var prev = scope.def(CURRENT_STATE, ".profile");
            scope(CURRENT_STATE, ".profile=", value, ";");
            scope.exit(CURRENT_STATE, ".profile=", prev, ";");
          }
          var USE_PROFILE;
          if (profileArg) {
            if (isStatic(profileArg)) {
              if (profileArg.enable) {
                emitProfileStart(scope);
                emitProfileEnd(scope.exit);
                scopeProfile("true");
              } else {
                scopeProfile("false");
              }
              return;
            }
            USE_PROFILE = profileArg.append(env, scope);
            scopeProfile(USE_PROFILE);
          } else {
            USE_PROFILE = scope.def(CURRENT_STATE, ".profile");
          }
          var start = env.block();
          emitProfileStart(start);
          scope("if(", USE_PROFILE, "){", start, "}");
          var end = env.block();
          emitProfileEnd(end);
          scope.exit("if(", USE_PROFILE, "){", end, "}");
        }
        function emitAttributes(env, scope, args, attributes, filter) {
          var shared = env.shared;
          function typeLength(x) {
            switch (x) {
              case GL_FLOAT_VEC2:
              case GL_INT_VEC2:
              case GL_BOOL_VEC2:
                return 2;
              case GL_FLOAT_VEC3:
              case GL_INT_VEC3:
              case GL_BOOL_VEC3:
                return 3;
              case GL_FLOAT_VEC4:
              case GL_INT_VEC4:
              case GL_BOOL_VEC4:
                return 4;
              default:
                return 1;
            }
          }
          function emitBindAttribute(ATTRIBUTE, size, record) {
            var GL = shared.gl;
            var LOCATION = scope.def(ATTRIBUTE, ".location");
            var BINDING = scope.def(shared.attributes, "[", LOCATION, "]");
            var STATE = record.state;
            var BUFFER = record.buffer;
            var CONST_COMPONENTS = [
              record.x,
              record.y,
              record.z,
              record.w
            ];
            var COMMON_KEYS = [
              "buffer",
              "normalized",
              "offset",
              "stride"
            ];
            function emitBuffer() {
              scope("if(!", BINDING, ".buffer){", GL, ".enableVertexAttribArray(", LOCATION, ");}");
              var TYPE = record.type;
              var SIZE;
              if (!record.size) {
                SIZE = size;
              } else {
                SIZE = scope.def(record.size, "||", size);
              }
              scope("if(", BINDING, ".type!==", TYPE, "||", BINDING, ".size!==", SIZE, "||", COMMON_KEYS.map(function(key) {
                return BINDING + "." + key + "!==" + record[key];
              }).join("||"), "){", GL, ".bindBuffer(", GL_ARRAY_BUFFER$2, ",", BUFFER, ".buffer);", GL, ".vertexAttribPointer(", [
                LOCATION,
                SIZE,
                TYPE,
                record.normalized,
                record.stride,
                record.offset
              ], ");", BINDING, ".type=", TYPE, ";", BINDING, ".size=", SIZE, ";", COMMON_KEYS.map(function(key) {
                return BINDING + "." + key + "=" + record[key] + ";";
              }).join(""), "}");
              if (extInstancing) {
                var DIVISOR = record.divisor;
                scope("if(", BINDING, ".divisor!==", DIVISOR, "){", env.instancing, ".vertexAttribDivisorANGLE(", [LOCATION, DIVISOR], ");", BINDING, ".divisor=", DIVISOR, ";}");
              }
            }
            function emitConstant() {
              scope("if(", BINDING, ".buffer){", GL, ".disableVertexAttribArray(", LOCATION, ");", BINDING, ".buffer=null;", "}if(", CUTE_COMPONENTS.map(function(c, i) {
                return BINDING + "." + c + "!==" + CONST_COMPONENTS[i];
              }).join("||"), "){", GL, ".vertexAttrib4f(", LOCATION, ",", CONST_COMPONENTS, ");", CUTE_COMPONENTS.map(function(c, i) {
                return BINDING + "." + c + "=" + CONST_COMPONENTS[i] + ";";
              }).join(""), "}");
            }
            if (STATE === ATTRIB_STATE_POINTER) {
              emitBuffer();
            } else if (STATE === ATTRIB_STATE_CONSTANT) {
              emitConstant();
            } else {
              scope("if(", STATE, "===", ATTRIB_STATE_POINTER, "){");
              emitBuffer();
              scope("}else{");
              emitConstant();
              scope("}");
            }
          }
          attributes.forEach(function(attribute) {
            var name = attribute.name;
            var arg = args.attributes[name];
            var record;
            if (arg) {
              if (!filter(arg)) {
                return;
              }
              record = arg.append(env, scope);
            } else {
              if (!filter(SCOPE_DECL)) {
                return;
              }
              var scopeAttrib = env.scopeAttrib(name);
              check$1.optional(function() {
                env.assert(scope, scopeAttrib + ".state", "missing attribute " + name);
              });
              record = {};
              Object.keys(new AttributeRecord2()).forEach(function(key) {
                record[key] = scope.def(scopeAttrib, ".", key);
              });
            }
            emitBindAttribute(env.link(attribute), typeLength(attribute.info.type), record);
          });
        }
        function emitUniforms(env, scope, args, uniforms, filter, isBatchInnerLoop) {
          var shared = env.shared;
          var GL = shared.gl;
          var definedArrUniforms = {};
          var infix;
          for (var i = 0; i < uniforms.length; ++i) {
            var uniform = uniforms[i];
            var name = uniform.name;
            var type = uniform.info.type;
            var size = uniform.info.size;
            var arg = args.uniforms[name];
            if (size > 1) {
              if (!arg) {
                continue;
              }
              var arrUniformName = name.replace("[0]", "");
              if (definedArrUniforms[arrUniformName]) {
                continue;
              }
              definedArrUniforms[arrUniformName] = 1;
            }
            var UNIFORM = env.link(uniform);
            var LOCATION = UNIFORM + ".location";
            var VALUE;
            if (arg) {
              if (!filter(arg)) {
                continue;
              }
              if (isStatic(arg)) {
                var value = arg.value;
                check$1.command(value !== null && typeof value !== "undefined", 'missing uniform "' + name + '"', env.commandStr);
                if (type === GL_SAMPLER_2D || type === GL_SAMPLER_CUBE) {
                  check$1.command(typeof value === "function" && (type === GL_SAMPLER_2D && (value._reglType === "texture2d" || value._reglType === "framebuffer") || type === GL_SAMPLER_CUBE && (value._reglType === "textureCube" || value._reglType === "framebufferCube")), "invalid texture for uniform " + name, env.commandStr);
                  var TEX_VALUE = env.link(value._texture || value.color[0]._texture);
                  scope(GL, ".uniform1i(", LOCATION, ",", TEX_VALUE + ".bind());");
                  scope.exit(TEX_VALUE, ".unbind();");
                } else if (type === GL_FLOAT_MAT2 || type === GL_FLOAT_MAT3 || type === GL_FLOAT_MAT4) {
                  check$1.optional(function() {
                    check$1.command(isArrayLike(value), "invalid matrix for uniform " + name, env.commandStr);
                    check$1.command(type === GL_FLOAT_MAT2 && value.length === 4 || type === GL_FLOAT_MAT3 && value.length === 9 || type === GL_FLOAT_MAT4 && value.length === 16, "invalid length for matrix uniform " + name, env.commandStr);
                  });
                  var MAT_VALUE = env.global.def("new Float32Array([" + Array.prototype.slice.call(value) + "])");
                  var dim = 2;
                  if (type === GL_FLOAT_MAT3) {
                    dim = 3;
                  } else if (type === GL_FLOAT_MAT4) {
                    dim = 4;
                  }
                  scope(GL, ".uniformMatrix", dim, "fv(", LOCATION, ",false,", MAT_VALUE, ");");
                } else {
                  switch (type) {
                    case GL_FLOAT$8:
                      if (size === 1) {
                        check$1.commandType(value, "number", "uniform " + name, env.commandStr);
                      } else {
                        check$1.command(isArrayLike(value) && value.length === size, "uniform " + name, env.commandStr);
                      }
                      infix = "1f";
                      break;
                    case GL_FLOAT_VEC2:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 2 === 0 && value.length <= size * 2), "uniform " + name, env.commandStr);
                      infix = "2f";
                      break;
                    case GL_FLOAT_VEC3:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 3 === 0 && value.length <= size * 3), "uniform " + name, env.commandStr);
                      infix = "3f";
                      break;
                    case GL_FLOAT_VEC4:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 4 === 0 && value.length <= size * 4), "uniform " + name, env.commandStr);
                      infix = "4f";
                      break;
                    case GL_BOOL:
                      if (size === 1) {
                        check$1.commandType(value, "boolean", "uniform " + name, env.commandStr);
                      } else {
                        check$1.command(isArrayLike(value) && value.length === size, "uniform " + name, env.commandStr);
                      }
                      infix = "1i";
                      break;
                    case GL_INT$3:
                      if (size === 1) {
                        check$1.commandType(value, "number", "uniform " + name, env.commandStr);
                      } else {
                        check$1.command(isArrayLike(value) && value.length === size, "uniform " + name, env.commandStr);
                      }
                      infix = "1i";
                      break;
                    case GL_BOOL_VEC2:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 2 === 0 && value.length <= size * 2), "uniform " + name, env.commandStr);
                      infix = "2i";
                      break;
                    case GL_INT_VEC2:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 2 === 0 && value.length <= size * 2), "uniform " + name, env.commandStr);
                      infix = "2i";
                      break;
                    case GL_BOOL_VEC3:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 3 === 0 && value.length <= size * 3), "uniform " + name, env.commandStr);
                      infix = "3i";
                      break;
                    case GL_INT_VEC3:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 3 === 0 && value.length <= size * 3), "uniform " + name, env.commandStr);
                      infix = "3i";
                      break;
                    case GL_BOOL_VEC4:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 4 === 0 && value.length <= size * 4), "uniform " + name, env.commandStr);
                      infix = "4i";
                      break;
                    case GL_INT_VEC4:
                      check$1.command(isArrayLike(value) && (value.length && value.length % 4 === 0 && value.length <= size * 4), "uniform " + name, env.commandStr);
                      infix = "4i";
                      break;
                  }
                  if (size > 1) {
                    infix += "v";
                    value = env.global.def("[" + Array.prototype.slice.call(value) + "]");
                  } else {
                    value = isArrayLike(value) ? Array.prototype.slice.call(value) : value;
                  }
                  scope(GL, ".uniform", infix, "(", LOCATION, ",", value, ");");
                }
                continue;
              } else {
                VALUE = arg.append(env, scope);
              }
            } else {
              if (!filter(SCOPE_DECL)) {
                continue;
              }
              VALUE = scope.def(shared.uniforms, "[", stringStore.id(name), "]");
            }
            if (type === GL_SAMPLER_2D) {
              check$1(!Array.isArray(VALUE), "must specify a scalar prop for textures");
              scope("if(", VALUE, "&&", VALUE, '._reglType==="framebuffer"){', VALUE, "=", VALUE, ".color[0];", "}");
            } else if (type === GL_SAMPLER_CUBE) {
              check$1(!Array.isArray(VALUE), "must specify a scalar prop for cube maps");
              scope("if(", VALUE, "&&", VALUE, '._reglType==="framebufferCube"){', VALUE, "=", VALUE, ".color[0];", "}");
            }
            check$1.optional(function() {
              function emitCheck(pred, message) {
                env.assert(scope, pred, 'bad data or missing for uniform "' + name + '".  ' + message);
              }
              function checkType(type2, size2) {
                if (size2 === 1) {
                  check$1(!Array.isArray(VALUE), "must not specify an array type for uniform");
                }
                emitCheck("Array.isArray(" + VALUE + ") && typeof " + VALUE + '[0]===" ' + type2 + '" || typeof ' + VALUE + '==="' + type2 + '"', "invalid type, expected " + type2);
              }
              function checkVector(n, type2, size2) {
                if (Array.isArray(VALUE)) {
                  check$1(VALUE.length && VALUE.length % n === 0 && VALUE.length <= n * size2, "must have length of " + (size2 === 1 ? "" : "n * ") + n);
                } else {
                  emitCheck(shared.isArrayLike + "(" + VALUE + ")&&" + VALUE + ".length && " + VALUE + ".length % " + n + " === 0 && " + VALUE + ".length<=" + n * size2, "invalid vector, should have length of " + (size2 === 1 ? "" : "n * ") + n, env.commandStr);
                }
              }
              function checkTexture(target) {
                check$1(!Array.isArray(VALUE), "must not specify a value type");
                emitCheck("typeof " + VALUE + '==="function"&&' + VALUE + '._reglType==="texture' + (target === GL_TEXTURE_2D$3 ? "2d" : "Cube") + '"', "invalid texture type", env.commandStr);
              }
              switch (type) {
                case GL_INT$3:
                  checkType("number", size);
                  break;
                case GL_INT_VEC2:
                  checkVector(2, "number", size);
                  break;
                case GL_INT_VEC3:
                  checkVector(3, "number", size);
                  break;
                case GL_INT_VEC4:
                  checkVector(4, "number", size);
                  break;
                case GL_FLOAT$8:
                  checkType("number", size);
                  break;
                case GL_FLOAT_VEC2:
                  checkVector(2, "number", size);
                  break;
                case GL_FLOAT_VEC3:
                  checkVector(3, "number", size);
                  break;
                case GL_FLOAT_VEC4:
                  checkVector(4, "number", size);
                  break;
                case GL_BOOL:
                  checkType("boolean", size);
                  break;
                case GL_BOOL_VEC2:
                  checkVector(2, "boolean", size);
                  break;
                case GL_BOOL_VEC3:
                  checkVector(3, "boolean", size);
                  break;
                case GL_BOOL_VEC4:
                  checkVector(4, "boolean", size);
                  break;
                case GL_FLOAT_MAT2:
                  checkVector(4, "number", size);
                  break;
                case GL_FLOAT_MAT3:
                  checkVector(9, "number", size);
                  break;
                case GL_FLOAT_MAT4:
                  checkVector(16, "number", size);
                  break;
                case GL_SAMPLER_2D:
                  checkTexture(GL_TEXTURE_2D$3);
                  break;
                case GL_SAMPLER_CUBE:
                  checkTexture(GL_TEXTURE_CUBE_MAP$2);
                  break;
              }
            });
            var unroll = 1;
            switch (type) {
              case GL_SAMPLER_2D:
              case GL_SAMPLER_CUBE:
                var TEX = scope.def(VALUE, "._texture");
                scope(GL, ".uniform1i(", LOCATION, ",", TEX, ".bind());");
                scope.exit(TEX, ".unbind();");
                continue;
              case GL_INT$3:
              case GL_BOOL:
                infix = "1i";
                break;
              case GL_INT_VEC2:
              case GL_BOOL_VEC2:
                infix = "2i";
                unroll = 2;
                break;
              case GL_INT_VEC3:
              case GL_BOOL_VEC3:
                infix = "3i";
                unroll = 3;
                break;
              case GL_INT_VEC4:
              case GL_BOOL_VEC4:
                infix = "4i";
                unroll = 4;
                break;
              case GL_FLOAT$8:
                infix = "1f";
                break;
              case GL_FLOAT_VEC2:
                infix = "2f";
                unroll = 2;
                break;
              case GL_FLOAT_VEC3:
                infix = "3f";
                unroll = 3;
                break;
              case GL_FLOAT_VEC4:
                infix = "4f";
                unroll = 4;
                break;
              case GL_FLOAT_MAT2:
                infix = "Matrix2fv";
                break;
              case GL_FLOAT_MAT3:
                infix = "Matrix3fv";
                break;
              case GL_FLOAT_MAT4:
                infix = "Matrix4fv";
                break;
            }
            if (infix.indexOf("Matrix") === -1 && size > 1) {
              infix += "v";
              unroll = 1;
            }
            if (infix.charAt(0) === "M") {
              scope(GL, ".uniform", infix, "(", LOCATION, ",");
              var matSize = Math.pow(type - GL_FLOAT_MAT2 + 2, 2);
              var STORAGE = env.global.def("new Float32Array(", matSize, ")");
              if (Array.isArray(VALUE)) {
                scope("false,(", loop(matSize, function(i2) {
                  return STORAGE + "[" + i2 + "]=" + VALUE[i2];
                }), ",", STORAGE, ")");
              } else {
                scope("false,(Array.isArray(", VALUE, ")||", VALUE, " instanceof Float32Array)?", VALUE, ":(", loop(matSize, function(i2) {
                  return STORAGE + "[" + i2 + "]=" + VALUE + "[" + i2 + "]";
                }), ",", STORAGE, ")");
              }
              scope(");");
            } else if (unroll > 1) {
              var prev = [];
              var cur = [];
              for (var j = 0; j < unroll; ++j) {
                if (Array.isArray(VALUE)) {
                  cur.push(VALUE[j]);
                } else {
                  cur.push(scope.def(VALUE + "[" + j + "]"));
                }
                if (isBatchInnerLoop) {
                  prev.push(scope.def());
                }
              }
              if (isBatchInnerLoop) {
                scope("if(!", env.batchId, "||", prev.map(function(p, i2) {
                  return p + "!==" + cur[i2];
                }).join("||"), "){", prev.map(function(p, i2) {
                  return p + "=" + cur[i2] + ";";
                }).join(""));
              }
              scope(GL, ".uniform", infix, "(", LOCATION, ",", cur.join(","), ");");
              if (isBatchInnerLoop) {
                scope("}");
              }
            } else {
              check$1(!Array.isArray(VALUE), "uniform value must not be an array");
              if (isBatchInnerLoop) {
                var prevS = scope.def();
                scope("if(!", env.batchId, "||", prevS, "!==", VALUE, "){", prevS, "=", VALUE, ";");
              }
              scope(GL, ".uniform", infix, "(", LOCATION, ",", VALUE, ");");
              if (isBatchInnerLoop) {
                scope("}");
              }
            }
          }
        }
        function emitDraw(env, outer, inner, args) {
          var shared = env.shared;
          var GL = shared.gl;
          var DRAW_STATE = shared.draw;
          var drawOptions = args.draw;
          function emitElements() {
            var defn = drawOptions.elements;
            var ELEMENTS2;
            var scope = outer;
            if (defn) {
              if (defn.contextDep && args.contextDynamic || defn.propDep) {
                scope = inner;
              }
              ELEMENTS2 = defn.append(env, scope);
              if (drawOptions.elementsActive) {
                scope("if(" + ELEMENTS2 + ")" + GL + ".bindBuffer(" + GL_ELEMENT_ARRAY_BUFFER$2 + "," + ELEMENTS2 + ".buffer.buffer);");
              }
            } else {
              ELEMENTS2 = scope.def();
              scope(ELEMENTS2, "=", DRAW_STATE, ".", S_ELEMENTS, ";", "if(", ELEMENTS2, "){", GL, ".bindBuffer(", GL_ELEMENT_ARRAY_BUFFER$2, ",", ELEMENTS2, ".buffer.buffer);}", "else if(", shared.vao, ".currentVAO){", ELEMENTS2, "=", env.shared.elements + ".getElements(" + shared.vao, ".currentVAO.elements);", !extVertexArrays ? "if(" + ELEMENTS2 + ")" + GL + ".bindBuffer(" + GL_ELEMENT_ARRAY_BUFFER$2 + "," + ELEMENTS2 + ".buffer.buffer);" : "", "}");
            }
            return ELEMENTS2;
          }
          function emitCount() {
            var defn = drawOptions.count;
            var COUNT2;
            var scope = outer;
            if (defn) {
              if (defn.contextDep && args.contextDynamic || defn.propDep) {
                scope = inner;
              }
              COUNT2 = defn.append(env, scope);
              check$1.optional(function() {
                if (defn.MISSING) {
                  env.assert(outer, "false", "missing vertex count");
                }
                if (defn.DYNAMIC) {
                  env.assert(scope, COUNT2 + ">=0", "missing vertex count");
                }
              });
            } else {
              COUNT2 = scope.def(DRAW_STATE, ".", S_COUNT);
              check$1.optional(function() {
                env.assert(scope, COUNT2 + ">=0", "missing vertex count");
              });
            }
            return COUNT2;
          }
          var ELEMENTS = emitElements();
          function emitValue(name) {
            var defn = drawOptions[name];
            if (defn) {
              if (defn.contextDep && args.contextDynamic || defn.propDep) {
                return defn.append(env, inner);
              } else {
                return defn.append(env, outer);
              }
            } else {
              return outer.def(DRAW_STATE, ".", name);
            }
          }
          var PRIMITIVE = emitValue(S_PRIMITIVE);
          var OFFSET = emitValue(S_OFFSET);
          var COUNT = emitCount();
          if (typeof COUNT === "number") {
            if (COUNT === 0) {
              return;
            }
          } else {
            inner("if(", COUNT, "){");
            inner.exit("}");
          }
          var INSTANCES, EXT_INSTANCING;
          if (extInstancing) {
            INSTANCES = emitValue(S_INSTANCES);
            EXT_INSTANCING = env.instancing;
          }
          var ELEMENT_TYPE = ELEMENTS + ".type";
          var elementsStatic = drawOptions.elements && isStatic(drawOptions.elements) && !drawOptions.vaoActive;
          function emitInstancing() {
            function drawElements() {
              inner(EXT_INSTANCING, ".drawElementsInstancedANGLE(", [
                PRIMITIVE,
                COUNT,
                ELEMENT_TYPE,
                OFFSET + "<<((" + ELEMENT_TYPE + "-" + GL_UNSIGNED_BYTE$8 + ")>>1)",
                INSTANCES
              ], ");");
            }
            function drawArrays() {
              inner(EXT_INSTANCING, ".drawArraysInstancedANGLE(", [PRIMITIVE, OFFSET, COUNT, INSTANCES], ");");
            }
            if (ELEMENTS && ELEMENTS !== "null") {
              if (!elementsStatic) {
                inner("if(", ELEMENTS, "){");
                drawElements();
                inner("}else{");
                drawArrays();
                inner("}");
              } else {
                drawElements();
              }
            } else {
              drawArrays();
            }
          }
          function emitRegular() {
            function drawElements() {
              inner(GL + ".drawElements(" + [
                PRIMITIVE,
                COUNT,
                ELEMENT_TYPE,
                OFFSET + "<<((" + ELEMENT_TYPE + "-" + GL_UNSIGNED_BYTE$8 + ")>>1)"
              ] + ");");
            }
            function drawArrays() {
              inner(GL + ".drawArrays(" + [PRIMITIVE, OFFSET, COUNT] + ");");
            }
            if (ELEMENTS && ELEMENTS !== "null") {
              if (!elementsStatic) {
                inner("if(", ELEMENTS, "){");
                drawElements();
                inner("}else{");
                drawArrays();
                inner("}");
              } else {
                drawElements();
              }
            } else {
              drawArrays();
            }
          }
          if (extInstancing && (typeof INSTANCES !== "number" || INSTANCES >= 0)) {
            if (typeof INSTANCES === "string") {
              inner("if(", INSTANCES, ">0){");
              emitInstancing();
              inner("}else if(", INSTANCES, "<0){");
              emitRegular();
              inner("}");
            } else {
              emitInstancing();
            }
          } else {
            emitRegular();
          }
        }
        function createBody(emitBody, parentEnv, args, program, count) {
          var env = createREGLEnvironment();
          var scope = env.proc("body", count);
          check$1.optional(function() {
            env.commandStr = parentEnv.commandStr;
            env.command = env.link(parentEnv.commandStr);
          });
          if (extInstancing) {
            env.instancing = scope.def(env.shared.extensions, ".angle_instanced_arrays");
          }
          emitBody(env, scope, args, program);
          return env.compile().body;
        }
        function emitDrawBody(env, draw, args, program) {
          injectExtensions(env, draw);
          if (args.useVAO) {
            if (args.drawVAO) {
              draw(env.shared.vao, ".setVAO(", args.drawVAO.append(env, draw), ");");
            } else {
              draw(env.shared.vao, ".setVAO(", env.shared.vao, ".targetVAO);");
            }
          } else {
            draw(env.shared.vao, ".setVAO(null);");
            emitAttributes(env, draw, args, program.attributes, function() {
              return true;
            });
          }
          emitUniforms(env, draw, args, program.uniforms, function() {
            return true;
          }, false);
          emitDraw(env, draw, draw, args);
        }
        function emitDrawProc(env, args) {
          var draw = env.proc("draw", 1);
          injectExtensions(env, draw);
          emitContext(env, draw, args.context);
          emitPollFramebuffer(env, draw, args.framebuffer);
          emitPollState(env, draw, args);
          emitSetOptions(env, draw, args.state);
          emitProfile(env, draw, args, false, true);
          var program = args.shader.progVar.append(env, draw);
          draw(env.shared.gl, ".useProgram(", program, ".program);");
          if (args.shader.program) {
            emitDrawBody(env, draw, args, args.shader.program);
          } else {
            draw(env.shared.vao, ".setVAO(null);");
            var drawCache = env.global.def("{}");
            var PROG_ID = draw.def(program, ".id");
            var CACHED_PROC = draw.def(drawCache, "[", PROG_ID, "]");
            draw(env.cond(CACHED_PROC).then(CACHED_PROC, ".call(this,a0);").else(CACHED_PROC, "=", drawCache, "[", PROG_ID, "]=", env.link(function(program2) {
              return createBody(emitDrawBody, env, args, program2, 1);
            }), "(", program, ");", CACHED_PROC, ".call(this,a0);"));
          }
          if (Object.keys(args.state).length > 0) {
            draw(env.shared.current, ".dirty=true;");
          }
          if (env.shared.vao) {
            draw(env.shared.vao, ".setVAO(null);");
          }
        }
        function emitBatchDynamicShaderBody(env, scope, args, program) {
          env.batchId = "a1";
          injectExtensions(env, scope);
          function all() {
            return true;
          }
          emitAttributes(env, scope, args, program.attributes, all);
          emitUniforms(env, scope, args, program.uniforms, all, false);
          emitDraw(env, scope, scope, args);
        }
        function emitBatchBody(env, scope, args, program) {
          injectExtensions(env, scope);
          var contextDynamic = args.contextDep;
          var BATCH_ID = scope.def();
          var PROP_LIST = "a0";
          var NUM_PROPS = "a1";
          var PROPS = scope.def();
          env.shared.props = PROPS;
          env.batchId = BATCH_ID;
          var outer = env.scope();
          var inner = env.scope();
          scope(outer.entry, "for(", BATCH_ID, "=0;", BATCH_ID, "<", NUM_PROPS, ";++", BATCH_ID, "){", PROPS, "=", PROP_LIST, "[", BATCH_ID, "];", inner, "}", outer.exit);
          function isInnerDefn(defn) {
            return defn.contextDep && contextDynamic || defn.propDep;
          }
          function isOuterDefn(defn) {
            return !isInnerDefn(defn);
          }
          if (args.needsContext) {
            emitContext(env, inner, args.context);
          }
          if (args.needsFramebuffer) {
            emitPollFramebuffer(env, inner, args.framebuffer);
          }
          emitSetOptions(env, inner, args.state, isInnerDefn);
          if (args.profile && isInnerDefn(args.profile)) {
            emitProfile(env, inner, args, false, true);
          }
          if (!program) {
            var progCache = env.global.def("{}");
            var PROGRAM = args.shader.progVar.append(env, inner);
            var PROG_ID = inner.def(PROGRAM, ".id");
            var CACHED_PROC = inner.def(progCache, "[", PROG_ID, "]");
            inner(env.shared.gl, ".useProgram(", PROGRAM, ".program);", "if(!", CACHED_PROC, "){", CACHED_PROC, "=", progCache, "[", PROG_ID, "]=", env.link(function(program2) {
              return createBody(emitBatchDynamicShaderBody, env, args, program2, 2);
            }), "(", PROGRAM, ");}", CACHED_PROC, ".call(this,a0[", BATCH_ID, "],", BATCH_ID, ");");
          } else {
            if (args.useVAO) {
              if (args.drawVAO) {
                if (isInnerDefn(args.drawVAO)) {
                  inner(env.shared.vao, ".setVAO(", args.drawVAO.append(env, inner), ");");
                } else {
                  outer(env.shared.vao, ".setVAO(", args.drawVAO.append(env, outer), ");");
                }
              } else {
                outer(env.shared.vao, ".setVAO(", env.shared.vao, ".targetVAO);");
              }
            } else {
              outer(env.shared.vao, ".setVAO(null);");
              emitAttributes(env, outer, args, program.attributes, isOuterDefn);
              emitAttributes(env, inner, args, program.attributes, isInnerDefn);
            }
            emitUniforms(env, outer, args, program.uniforms, isOuterDefn, false);
            emitUniforms(env, inner, args, program.uniforms, isInnerDefn, true);
            emitDraw(env, outer, inner, args);
          }
        }
        function emitBatchProc(env, args) {
          var batch = env.proc("batch", 2);
          env.batchId = "0";
          injectExtensions(env, batch);
          var contextDynamic = false;
          var needsContext = true;
          Object.keys(args.context).forEach(function(name) {
            contextDynamic = contextDynamic || args.context[name].propDep;
          });
          if (!contextDynamic) {
            emitContext(env, batch, args.context);
            needsContext = false;
          }
          var framebuffer = args.framebuffer;
          var needsFramebuffer = false;
          if (framebuffer) {
            if (framebuffer.propDep) {
              contextDynamic = needsFramebuffer = true;
            } else if (framebuffer.contextDep && contextDynamic) {
              needsFramebuffer = true;
            }
            if (!needsFramebuffer) {
              emitPollFramebuffer(env, batch, framebuffer);
            }
          } else {
            emitPollFramebuffer(env, batch, null);
          }
          if (args.state.viewport && args.state.viewport.propDep) {
            contextDynamic = true;
          }
          function isInnerDefn(defn) {
            return defn.contextDep && contextDynamic || defn.propDep;
          }
          emitPollState(env, batch, args);
          emitSetOptions(env, batch, args.state, function(defn) {
            return !isInnerDefn(defn);
          });
          if (!args.profile || !isInnerDefn(args.profile)) {
            emitProfile(env, batch, args, false, "a1");
          }
          args.contextDep = contextDynamic;
          args.needsContext = needsContext;
          args.needsFramebuffer = needsFramebuffer;
          var progDefn = args.shader.progVar;
          if (progDefn.contextDep && contextDynamic || progDefn.propDep) {
            emitBatchBody(env, batch, args, null);
          } else {
            var PROGRAM = progDefn.append(env, batch);
            batch(env.shared.gl, ".useProgram(", PROGRAM, ".program);");
            if (args.shader.program) {
              emitBatchBody(env, batch, args, args.shader.program);
            } else {
              batch(env.shared.vao, ".setVAO(null);");
              var batchCache = env.global.def("{}");
              var PROG_ID = batch.def(PROGRAM, ".id");
              var CACHED_PROC = batch.def(batchCache, "[", PROG_ID, "]");
              batch(env.cond(CACHED_PROC).then(CACHED_PROC, ".call(this,a0,a1);").else(CACHED_PROC, "=", batchCache, "[", PROG_ID, "]=", env.link(function(program) {
                return createBody(emitBatchBody, env, args, program, 2);
              }), "(", PROGRAM, ");", CACHED_PROC, ".call(this,a0,a1);"));
            }
          }
          if (Object.keys(args.state).length > 0) {
            batch(env.shared.current, ".dirty=true;");
          }
          if (env.shared.vao) {
            batch(env.shared.vao, ".setVAO(null);");
          }
        }
        function emitScopeProc(env, args) {
          var scope = env.proc("scope", 3);
          env.batchId = "a2";
          var shared = env.shared;
          var CURRENT_STATE = shared.current;
          emitContext(env, scope, args.context);
          if (args.framebuffer) {
            args.framebuffer.append(env, scope);
          }
          sortState(Object.keys(args.state)).forEach(function(name) {
            var defn = args.state[name];
            var value = defn.append(env, scope);
            if (isArrayLike(value)) {
              value.forEach(function(v, i) {
                scope.set(env.next[name], "[" + i + "]", v);
              });
            } else {
              scope.set(shared.next, "." + name, value);
            }
          });
          emitProfile(env, scope, args, true, true);
          [S_ELEMENTS, S_OFFSET, S_COUNT, S_INSTANCES, S_PRIMITIVE].forEach(function(opt) {
            var variable = args.draw[opt];
            if (!variable) {
              return;
            }
            scope.set(shared.draw, "." + opt, "" + variable.append(env, scope));
          });
          Object.keys(args.uniforms).forEach(function(opt) {
            var value = args.uniforms[opt].append(env, scope);
            if (Array.isArray(value)) {
              value = "[" + value.join() + "]";
            }
            scope.set(shared.uniforms, "[" + stringStore.id(opt) + "]", value);
          });
          Object.keys(args.attributes).forEach(function(name) {
            var record = args.attributes[name].append(env, scope);
            var scopeAttrib = env.scopeAttrib(name);
            Object.keys(new AttributeRecord2()).forEach(function(prop) {
              scope.set(scopeAttrib, "." + prop, record[prop]);
            });
          });
          if (args.scopeVAO) {
            scope.set(shared.vao, ".targetVAO", args.scopeVAO.append(env, scope));
          }
          function saveShader(name) {
            var shader2 = args.shader[name];
            if (shader2) {
              scope.set(shared.shader, "." + name, shader2.append(env, scope));
            }
          }
          saveShader(S_VERT);
          saveShader(S_FRAG);
          if (Object.keys(args.state).length > 0) {
            scope(CURRENT_STATE, ".dirty=true;");
            scope.exit(CURRENT_STATE, ".dirty=true;");
          }
          scope("a1(", env.shared.context, ",a0,", env.batchId, ");");
        }
        function isDynamicObject(object) {
          if (typeof object !== "object" || isArrayLike(object)) {
            return;
          }
          var props = Object.keys(object);
          for (var i = 0; i < props.length; ++i) {
            if (dynamic.isDynamic(object[props[i]])) {
              return true;
            }
          }
          return false;
        }
        function splatObject(env, options2, name) {
          var object = options2.static[name];
          if (!object || !isDynamicObject(object)) {
            return;
          }
          var globals = env.global;
          var keys = Object.keys(object);
          var thisDep = false;
          var contextDep = false;
          var propDep = false;
          var objectRef = env.global.def("{}");
          keys.forEach(function(key) {
            var value = object[key];
            if (dynamic.isDynamic(value)) {
              if (typeof value === "function") {
                value = object[key] = dynamic.unbox(value);
              }
              var deps = createDynamicDecl(value, null);
              thisDep = thisDep || deps.thisDep;
              propDep = propDep || deps.propDep;
              contextDep = contextDep || deps.contextDep;
            } else {
              globals(objectRef, ".", key, "=");
              switch (typeof value) {
                case "number":
                  globals(value);
                  break;
                case "string":
                  globals('"', value, '"');
                  break;
                case "object":
                  if (Array.isArray(value)) {
                    globals("[", value.join(), "]");
                  }
                  break;
                default:
                  globals(env.link(value));
                  break;
              }
              globals(";");
            }
          });
          function appendBlock(env2, block) {
            keys.forEach(function(key) {
              var value = object[key];
              if (!dynamic.isDynamic(value)) {
                return;
              }
              var ref = env2.invoke(block, value);
              block(objectRef, ".", key, "=", ref, ";");
            });
          }
          options2.dynamic[name] = new dynamic.DynamicVariable(DYN_THUNK, {
            thisDep,
            contextDep,
            propDep,
            ref: objectRef,
            append: appendBlock
          });
          delete options2.static[name];
        }
        function compileCommand(options2, attributes, uniforms, context, stats2) {
          var env = createREGLEnvironment();
          env.stats = env.link(stats2);
          Object.keys(attributes.static).forEach(function(key) {
            splatObject(env, attributes, key);
          });
          NESTED_OPTIONS.forEach(function(name) {
            splatObject(env, options2, name);
          });
          var args = parseArguments(options2, attributes, uniforms, context, env);
          emitDrawProc(env, args);
          emitScopeProc(env, args);
          emitBatchProc(env, args);
          return extend(env.compile(), {
            destroy: function() {
              args.shader.program.destroy();
            }
          });
        }
        return {
          next: nextState,
          current: currentState,
          procs: function() {
            var env = createREGLEnvironment();
            var poll = env.proc("poll");
            var refresh = env.proc("refresh");
            var common = env.block();
            poll(common);
            refresh(common);
            var shared = env.shared;
            var GL = shared.gl;
            var NEXT_STATE = shared.next;
            var CURRENT_STATE = shared.current;
            common(CURRENT_STATE, ".dirty=false;");
            emitPollFramebuffer(env, poll);
            emitPollFramebuffer(env, refresh, null, true);
            var INSTANCING;
            if (extInstancing) {
              INSTANCING = env.link(extInstancing);
            }
            if (extensions.oes_vertex_array_object) {
              refresh(env.link(extensions.oes_vertex_array_object), ".bindVertexArrayOES(null);");
            }
            for (var i = 0; i < limits.maxAttributes; ++i) {
              var BINDING = refresh.def(shared.attributes, "[", i, "]");
              var ifte = env.cond(BINDING, ".buffer");
              ifte.then(GL, ".enableVertexAttribArray(", i, ");", GL, ".bindBuffer(", GL_ARRAY_BUFFER$2, ",", BINDING, ".buffer.buffer);", GL, ".vertexAttribPointer(", i, ",", BINDING, ".size,", BINDING, ".type,", BINDING, ".normalized,", BINDING, ".stride,", BINDING, ".offset);").else(GL, ".disableVertexAttribArray(", i, ");", GL, ".vertexAttrib4f(", i, ",", BINDING, ".x,", BINDING, ".y,", BINDING, ".z,", BINDING, ".w);", BINDING, ".buffer=null;");
              refresh(ifte);
              if (extInstancing) {
                refresh(INSTANCING, ".vertexAttribDivisorANGLE(", i, ",", BINDING, ".divisor);");
              }
            }
            refresh(env.shared.vao, ".currentVAO=null;", env.shared.vao, ".setVAO(", env.shared.vao, ".targetVAO);");
            Object.keys(GL_FLAGS).forEach(function(flag) {
              var cap = GL_FLAGS[flag];
              var NEXT = common.def(NEXT_STATE, ".", flag);
              var block = env.block();
              block("if(", NEXT, "){", GL, ".enable(", cap, ")}else{", GL, ".disable(", cap, ")}", CURRENT_STATE, ".", flag, "=", NEXT, ";");
              refresh(block);
              poll("if(", NEXT, "!==", CURRENT_STATE, ".", flag, "){", block, "}");
            });
            Object.keys(GL_VARIABLES).forEach(function(name) {
              var func = GL_VARIABLES[name];
              var init2 = currentState[name];
              var NEXT, CURRENT;
              var block = env.block();
              block(GL, ".", func, "(");
              if (isArrayLike(init2)) {
                var n = init2.length;
                NEXT = env.global.def(NEXT_STATE, ".", name);
                CURRENT = env.global.def(CURRENT_STATE, ".", name);
                block(loop(n, function(i2) {
                  return NEXT + "[" + i2 + "]";
                }), ");", loop(n, function(i2) {
                  return CURRENT + "[" + i2 + "]=" + NEXT + "[" + i2 + "];";
                }).join(""));
                poll("if(", loop(n, function(i2) {
                  return NEXT + "[" + i2 + "]!==" + CURRENT + "[" + i2 + "]";
                }).join("||"), "){", block, "}");
              } else {
                NEXT = common.def(NEXT_STATE, ".", name);
                CURRENT = common.def(CURRENT_STATE, ".", name);
                block(NEXT, ");", CURRENT_STATE, ".", name, "=", NEXT, ";");
                poll("if(", NEXT, "!==", CURRENT, "){", block, "}");
              }
              refresh(block);
            });
            return env.compile();
          }(),
          compile: compileCommand
        };
      }
      function stats() {
        return {
          vaoCount: 0,
          bufferCount: 0,
          elementsCount: 0,
          framebufferCount: 0,
          shaderCount: 0,
          textureCount: 0,
          cubeCount: 0,
          renderbufferCount: 0,
          maxTextureUnits: 0
        };
      }
      var GL_QUERY_RESULT_EXT = 34918;
      var GL_QUERY_RESULT_AVAILABLE_EXT = 34919;
      var GL_TIME_ELAPSED_EXT = 35007;
      var createTimer = function(gl, extensions) {
        if (!extensions.ext_disjoint_timer_query) {
          return null;
        }
        var queryPool = [];
        function allocQuery() {
          return queryPool.pop() || extensions.ext_disjoint_timer_query.createQueryEXT();
        }
        function freeQuery(query) {
          queryPool.push(query);
        }
        var pendingQueries = [];
        function beginQuery(stats2) {
          var query = allocQuery();
          extensions.ext_disjoint_timer_query.beginQueryEXT(GL_TIME_ELAPSED_EXT, query);
          pendingQueries.push(query);
          pushScopeStats(pendingQueries.length - 1, pendingQueries.length, stats2);
        }
        function endQuery() {
          extensions.ext_disjoint_timer_query.endQueryEXT(GL_TIME_ELAPSED_EXT);
        }
        function PendingStats() {
          this.startQueryIndex = -1;
          this.endQueryIndex = -1;
          this.sum = 0;
          this.stats = null;
        }
        var pendingStatsPool = [];
        function allocPendingStats() {
          return pendingStatsPool.pop() || new PendingStats();
        }
        function freePendingStats(pendingStats2) {
          pendingStatsPool.push(pendingStats2);
        }
        var pendingStats = [];
        function pushScopeStats(start, end, stats2) {
          var ps = allocPendingStats();
          ps.startQueryIndex = start;
          ps.endQueryIndex = end;
          ps.sum = 0;
          ps.stats = stats2;
          pendingStats.push(ps);
        }
        var timeSum = [];
        var queryPtr = [];
        function update() {
          var ptr, i;
          var n = pendingQueries.length;
          if (n === 0) {
            return;
          }
          queryPtr.length = Math.max(queryPtr.length, n + 1);
          timeSum.length = Math.max(timeSum.length, n + 1);
          timeSum[0] = 0;
          queryPtr[0] = 0;
          var queryTime = 0;
          ptr = 0;
          for (i = 0; i < pendingQueries.length; ++i) {
            var query = pendingQueries[i];
            if (extensions.ext_disjoint_timer_query.getQueryObjectEXT(query, GL_QUERY_RESULT_AVAILABLE_EXT)) {
              queryTime += extensions.ext_disjoint_timer_query.getQueryObjectEXT(query, GL_QUERY_RESULT_EXT);
              freeQuery(query);
            } else {
              pendingQueries[ptr++] = query;
            }
            timeSum[i + 1] = queryTime;
            queryPtr[i + 1] = ptr;
          }
          pendingQueries.length = ptr;
          ptr = 0;
          for (i = 0; i < pendingStats.length; ++i) {
            var stats2 = pendingStats[i];
            var start = stats2.startQueryIndex;
            var end = stats2.endQueryIndex;
            stats2.sum += timeSum[end] - timeSum[start];
            var startPtr = queryPtr[start];
            var endPtr = queryPtr[end];
            if (endPtr === startPtr) {
              stats2.stats.gpuTime += stats2.sum / 1e6;
              freePendingStats(stats2);
            } else {
              stats2.startQueryIndex = startPtr;
              stats2.endQueryIndex = endPtr;
              pendingStats[ptr++] = stats2;
            }
          }
          pendingStats.length = ptr;
        }
        return {
          beginQuery,
          endQuery,
          pushScopeStats,
          update,
          getNumPendingQueries: function() {
            return pendingQueries.length;
          },
          clear: function() {
            queryPool.push.apply(queryPool, pendingQueries);
            for (var i = 0; i < queryPool.length; i++) {
              extensions.ext_disjoint_timer_query.deleteQueryEXT(queryPool[i]);
            }
            pendingQueries.length = 0;
            queryPool.length = 0;
          },
          restore: function() {
            pendingQueries.length = 0;
            queryPool.length = 0;
          }
        };
      };
      var GL_COLOR_BUFFER_BIT = 16384;
      var GL_DEPTH_BUFFER_BIT = 256;
      var GL_STENCIL_BUFFER_BIT = 1024;
      var GL_ARRAY_BUFFER = 34962;
      var CONTEXT_LOST_EVENT = "webglcontextlost";
      var CONTEXT_RESTORED_EVENT = "webglcontextrestored";
      var DYN_PROP = 1;
      var DYN_CONTEXT = 2;
      var DYN_STATE = 3;
      function find(haystack, needle) {
        for (var i = 0; i < haystack.length; ++i) {
          if (haystack[i] === needle) {
            return i;
          }
        }
        return -1;
      }
      function wrapREGL(args) {
        var config = parseArgs(args);
        if (!config) {
          return null;
        }
        var gl = config.gl;
        var glAttributes = gl.getContextAttributes();
        var contextLost = gl.isContextLost();
        var extensionState = createExtensionCache(gl, config);
        if (!extensionState) {
          return null;
        }
        var stringStore = createStringStore();
        var stats$$1 = stats();
        var extensions = extensionState.extensions;
        var timer = createTimer(gl, extensions);
        var START_TIME = clock();
        var WIDTH = gl.drawingBufferWidth;
        var HEIGHT = gl.drawingBufferHeight;
        var contextState = {
          tick: 0,
          time: 0,
          viewportWidth: WIDTH,
          viewportHeight: HEIGHT,
          framebufferWidth: WIDTH,
          framebufferHeight: HEIGHT,
          drawingBufferWidth: WIDTH,
          drawingBufferHeight: HEIGHT,
          pixelRatio: config.pixelRatio
        };
        var uniformState = {};
        var drawState = {
          elements: null,
          primitive: 4,
          count: -1,
          offset: 0,
          instances: -1
        };
        var limits = wrapLimits(gl, extensions);
        var bufferState = wrapBufferState(gl, stats$$1, config, destroyBuffer);
        var elementState = wrapElementsState(gl, extensions, bufferState, stats$$1);
        var attributeState = wrapAttributeState(gl, extensions, limits, stats$$1, bufferState, elementState, drawState);
        function destroyBuffer(buffer) {
          return attributeState.destroyBuffer(buffer);
        }
        var shaderState = wrapShaderState(gl, stringStore, stats$$1, config);
        var textureState = createTextureSet(gl, extensions, limits, function() {
          core.procs.poll();
        }, contextState, stats$$1, config);
        var renderbufferState = wrapRenderbuffers(gl, extensions, limits, stats$$1, config);
        var framebufferState = wrapFBOState(gl, extensions, limits, textureState, renderbufferState, stats$$1);
        var core = reglCore(gl, stringStore, extensions, limits, bufferState, elementState, textureState, framebufferState, uniformState, attributeState, shaderState, drawState, contextState, timer, config);
        var readPixels = wrapReadPixels(gl, framebufferState, core.procs.poll, contextState, glAttributes, extensions, limits);
        var nextState = core.next;
        var canvas = gl.canvas;
        var rafCallbacks = [];
        var lossCallbacks = [];
        var restoreCallbacks = [];
        var destroyCallbacks = [config.onDestroy];
        var activeRAF = null;
        function handleRAF() {
          if (rafCallbacks.length === 0) {
            if (timer) {
              timer.update();
            }
            activeRAF = null;
            return;
          }
          activeRAF = raf.next(handleRAF);
          poll();
          for (var i = rafCallbacks.length - 1; i >= 0; --i) {
            var cb = rafCallbacks[i];
            if (cb) {
              cb(contextState, null, 0);
            }
          }
          gl.flush();
          if (timer) {
            timer.update();
          }
        }
        function startRAF() {
          if (!activeRAF && rafCallbacks.length > 0) {
            activeRAF = raf.next(handleRAF);
          }
        }
        function stopRAF() {
          if (activeRAF) {
            raf.cancel(handleRAF);
            activeRAF = null;
          }
        }
        function handleContextLoss(event) {
          event.preventDefault();
          contextLost = true;
          stopRAF();
          lossCallbacks.forEach(function(cb) {
            cb();
          });
        }
        function handleContextRestored(event) {
          gl.getError();
          contextLost = false;
          extensionState.restore();
          shaderState.restore();
          bufferState.restore();
          textureState.restore();
          renderbufferState.restore();
          framebufferState.restore();
          attributeState.restore();
          if (timer) {
            timer.restore();
          }
          core.procs.refresh();
          startRAF();
          restoreCallbacks.forEach(function(cb) {
            cb();
          });
        }
        if (canvas) {
          canvas.addEventListener(CONTEXT_LOST_EVENT, handleContextLoss, false);
          canvas.addEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored, false);
        }
        function destroy() {
          rafCallbacks.length = 0;
          stopRAF();
          if (canvas) {
            canvas.removeEventListener(CONTEXT_LOST_EVENT, handleContextLoss);
            canvas.removeEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored);
          }
          shaderState.clear();
          framebufferState.clear();
          renderbufferState.clear();
          attributeState.clear();
          textureState.clear();
          elementState.clear();
          bufferState.clear();
          if (timer) {
            timer.clear();
          }
          destroyCallbacks.forEach(function(cb) {
            cb();
          });
        }
        function compileProcedure(options2) {
          check$1(!!options2, "invalid args to regl({...})");
          check$1.type(options2, "object", "invalid args to regl({...})");
          function flattenNestedOptions(options3) {
            var result = extend({}, options3);
            delete result.uniforms;
            delete result.attributes;
            delete result.context;
            delete result.vao;
            if ("stencil" in result && result.stencil.op) {
              result.stencil.opBack = result.stencil.opFront = result.stencil.op;
              delete result.stencil.op;
            }
            function merge(name) {
              if (name in result) {
                var child = result[name];
                delete result[name];
                Object.keys(child).forEach(function(prop) {
                  result[name + "." + prop] = child[prop];
                });
              }
            }
            merge("blend");
            merge("depth");
            merge("cull");
            merge("stencil");
            merge("polygonOffset");
            merge("scissor");
            merge("sample");
            if ("vao" in options3) {
              result.vao = options3.vao;
            }
            return result;
          }
          function separateDynamic(object, useArrays) {
            var staticItems = {};
            var dynamicItems = {};
            Object.keys(object).forEach(function(option) {
              var value = object[option];
              if (dynamic.isDynamic(value)) {
                dynamicItems[option] = dynamic.unbox(value, option);
                return;
              } else if (useArrays && Array.isArray(value)) {
                for (var i = 0; i < value.length; ++i) {
                  if (dynamic.isDynamic(value[i])) {
                    dynamicItems[option] = dynamic.unbox(value, option);
                    return;
                  }
                }
              }
              staticItems[option] = value;
            });
            return {
              dynamic: dynamicItems,
              static: staticItems
            };
          }
          var context = separateDynamic(options2.context || {}, true);
          var uniforms = separateDynamic(options2.uniforms || {}, true);
          var attributes = separateDynamic(options2.attributes || {}, false);
          var opts = separateDynamic(flattenNestedOptions(options2), false);
          var stats$$12 = {
            gpuTime: 0,
            cpuTime: 0,
            count: 0
          };
          var compiled = core.compile(opts, attributes, uniforms, context, stats$$12);
          var draw = compiled.draw;
          var batch = compiled.batch;
          var scope = compiled.scope;
          var EMPTY_ARRAY = [];
          function reserve(count) {
            while (EMPTY_ARRAY.length < count) {
              EMPTY_ARRAY.push(null);
            }
            return EMPTY_ARRAY;
          }
          function REGLCommand(args2, body) {
            var i;
            if (contextLost) {
              check$1.raise("context lost");
            }
            if (typeof args2 === "function") {
              return scope.call(this, null, args2, 0);
            } else if (typeof body === "function") {
              if (typeof args2 === "number") {
                for (i = 0; i < args2; ++i) {
                  scope.call(this, null, body, i);
                }
              } else if (Array.isArray(args2)) {
                for (i = 0; i < args2.length; ++i) {
                  scope.call(this, args2[i], body, i);
                }
              } else {
                return scope.call(this, args2, body, 0);
              }
            } else if (typeof args2 === "number") {
              if (args2 > 0) {
                return batch.call(this, reserve(args2 | 0), args2 | 0);
              }
            } else if (Array.isArray(args2)) {
              if (args2.length) {
                return batch.call(this, args2, args2.length);
              }
            } else {
              return draw.call(this, args2);
            }
          }
          return extend(REGLCommand, {
            stats: stats$$12,
            destroy: function() {
              compiled.destroy();
            }
          });
        }
        var setFBO = framebufferState.setFBO = compileProcedure({
          framebuffer: dynamic.define.call(null, DYN_PROP, "framebuffer")
        });
        function clearImpl(_, options2) {
          var clearFlags = 0;
          core.procs.poll();
          var c = options2.color;
          if (c) {
            gl.clearColor(+c[0] || 0, +c[1] || 0, +c[2] || 0, +c[3] || 0);
            clearFlags |= GL_COLOR_BUFFER_BIT;
          }
          if ("depth" in options2) {
            gl.clearDepth(+options2.depth);
            clearFlags |= GL_DEPTH_BUFFER_BIT;
          }
          if ("stencil" in options2) {
            gl.clearStencil(options2.stencil | 0);
            clearFlags |= GL_STENCIL_BUFFER_BIT;
          }
          check$1(!!clearFlags, "called regl.clear with no buffer specified");
          gl.clear(clearFlags);
        }
        function clear(options2) {
          check$1(typeof options2 === "object" && options2, "regl.clear() takes an object as input");
          if ("framebuffer" in options2) {
            if (options2.framebuffer && options2.framebuffer_reglType === "framebufferCube") {
              for (var i = 0; i < 6; ++i) {
                setFBO(extend({
                  framebuffer: options2.framebuffer.faces[i]
                }, options2), clearImpl);
              }
            } else {
              setFBO(options2, clearImpl);
            }
          } else {
            clearImpl(null, options2);
          }
        }
        function frame(cb) {
          check$1.type(cb, "function", "regl.frame() callback must be a function");
          rafCallbacks.push(cb);
          function cancel() {
            var i = find(rafCallbacks, cb);
            check$1(i >= 0, "cannot cancel a frame twice");
            function pendingCancel() {
              var index2 = find(rafCallbacks, pendingCancel);
              rafCallbacks[index2] = rafCallbacks[rafCallbacks.length - 1];
              rafCallbacks.length -= 1;
              if (rafCallbacks.length <= 0) {
                stopRAF();
              }
            }
            rafCallbacks[i] = pendingCancel;
          }
          startRAF();
          return {
            cancel
          };
        }
        function pollViewport() {
          var viewport = nextState.viewport;
          var scissorBox = nextState.scissor_box;
          viewport[0] = viewport[1] = scissorBox[0] = scissorBox[1] = 0;
          contextState.viewportWidth = contextState.framebufferWidth = contextState.drawingBufferWidth = viewport[2] = scissorBox[2] = gl.drawingBufferWidth;
          contextState.viewportHeight = contextState.framebufferHeight = contextState.drawingBufferHeight = viewport[3] = scissorBox[3] = gl.drawingBufferHeight;
        }
        function poll() {
          contextState.tick += 1;
          contextState.time = now();
          pollViewport();
          core.procs.poll();
        }
        function refresh() {
          textureState.refresh();
          pollViewport();
          core.procs.refresh();
          if (timer) {
            timer.update();
          }
        }
        function now() {
          return (clock() - START_TIME) / 1e3;
        }
        refresh();
        function addListener(event, callback) {
          check$1.type(callback, "function", "listener callback must be a function");
          var callbacks;
          switch (event) {
            case "frame":
              return frame(callback);
            case "lost":
              callbacks = lossCallbacks;
              break;
            case "restore":
              callbacks = restoreCallbacks;
              break;
            case "destroy":
              callbacks = destroyCallbacks;
              break;
            default:
              check$1.raise("invalid event, must be one of frame,lost,restore,destroy");
          }
          callbacks.push(callback);
          return {
            cancel: function() {
              for (var i = 0; i < callbacks.length; ++i) {
                if (callbacks[i] === callback) {
                  callbacks[i] = callbacks[callbacks.length - 1];
                  callbacks.pop();
                  return;
                }
              }
            }
          };
        }
        var regl = extend(compileProcedure, {
          clear,
          prop: dynamic.define.bind(null, DYN_PROP),
          context: dynamic.define.bind(null, DYN_CONTEXT),
          this: dynamic.define.bind(null, DYN_STATE),
          draw: compileProcedure({}),
          buffer: function(options2) {
            return bufferState.create(options2, GL_ARRAY_BUFFER, false, false);
          },
          elements: function(options2) {
            return elementState.create(options2, false);
          },
          texture: textureState.create2D,
          cube: textureState.createCube,
          renderbuffer: renderbufferState.create,
          framebuffer: framebufferState.create,
          framebufferCube: framebufferState.createCube,
          vao: attributeState.createVAO,
          attributes: glAttributes,
          frame,
          on: addListener,
          limits,
          hasExtension: function(name) {
            return limits.extensions.indexOf(name.toLowerCase()) >= 0;
          },
          read: readPixels,
          destroy,
          _gl: gl,
          _refresh: refresh,
          poll: function() {
            poll();
            if (timer) {
              timer.update();
            }
          },
          now,
          stats: stats$$1
        });
        config.onDone(null, regl);
        return regl;
      }
      return wrapREGL;
    });
  }
});

// .svelte-kit/vercel/entry.js
__export(exports, {
  default: () => entry_default
});
init_shims();

// node_modules/@sveltejs/kit/dist/node.js
init_shims();
function getRawBody(req) {
  return new Promise((fulfil, reject) => {
    const h = req.headers;
    if (!h["content-type"]) {
      return fulfil(null);
    }
    req.on("error", reject);
    const length = Number(h["content-length"]);
    if (isNaN(length) && h["transfer-encoding"] == null) {
      return fulfil(null);
    }
    let data2 = new Uint8Array(length || 0);
    if (length > 0) {
      let offset = 0;
      req.on("data", (chunk) => {
        const new_len = offset + Buffer.byteLength(chunk);
        if (new_len > length) {
          return reject({
            status: 413,
            reason: 'Exceeded "Content-Length" limit'
          });
        }
        data2.set(chunk, offset);
        offset = new_len;
      });
    } else {
      req.on("data", (chunk) => {
        const new_data = new Uint8Array(data2.length + chunk.length);
        new_data.set(data2, 0);
        new_data.set(chunk, data2.length);
        data2 = new_data;
      });
    }
    req.on("end", () => {
      fulfil(data2);
    });
  });
}

// .svelte-kit/output/server/app.js
init_shims();
var import_regl = __toModule(require_regl());
var __require2 = typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler) {
    return;
  }
  const params = route.params(match);
  const response = await handler({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page && page.path)},
						query: new URLSearchParams(${page ? s$1(page.query.toString()) : ""}),
						params: ${page && s$1(page.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url="${url}"`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data2, fail) {
  try {
    return devalue(data2);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  context,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const filename = resolved.replace(options2.paths.assets, "").slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape$1(body)}}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      context: { ...context }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    context: loaded.context || context,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
var escaped$2 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape$1(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$2) {
      result += escaped$2[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
var absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    context: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      context: loaded ? loaded.context : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let context = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              context,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    context: node_loaded.context,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.context) {
          context = {
            ...context,
            ...loaded.loaded.context
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  constructor(map) {
    __privateAdd(this, _map, void 0);
    __privateSet(this, _map, map);
  }
  get(key) {
    const value = __privateGet(this, _map).get(key);
    return value && value[0];
  }
  getAll(key) {
    return __privateGet(this, _map).get(key);
  }
  has(key) {
    return __privateGet(this, _map).has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of __privateGet(this, _map))
      yield key;
  }
  *values() {
    for (const [, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
};
_map = new WeakMap();
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data: data2, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data2;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data: data2, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data2;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
Promise.resolve();
var escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
var css$6 = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AAsDC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css$6);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
var base = "";
var assets = "";
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
var template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <link rel="icon" href="/favicon.png" />\n    <link rel="stylesheet" href="/global.css" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link\n      href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap"\n      rel="stylesheet"\n    />\n    ' + head + '\n  </head>\n  <body>\n    <div id="svelte">' + body + "</div>\n  </body>\n</html>\n";
var options = null;
var default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-ee69c401.js",
      css: [assets + "/_app/assets/start-61d1577b.css"],
      js: [assets + "/_app/start-ee69c401.js", assets + "/_app/chunks/vendor-13fc10bd.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
var d = (s2) => s2.replace(/%23/g, "#").replace(/%3[Bb]/g, ";").replace(/%2[Cc]/g, ",").replace(/%2[Ff]/g, "/").replace(/%3[Ff]/g, "?").replace(/%3[Aa]/g, ":").replace(/%40/g, "@").replace(/%26/g, "&").replace(/%3[Dd]/g, "=").replace(/%2[Bb]/g, "+").replace(/%24/g, "$");
var empty = () => ({});
var manifest = {
  assets: [{ "file": "favicon.png", "size": 15291, "type": "image/png" }, { "file": "global.css", "size": 1122, "type": "text/css" }],
  layout: ".svelte-kit/build/components/layout.svelte",
  error: "src/routes/__error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: [".svelte-kit/build/components/layout.svelte", "src/routes/index.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "endpoint",
      pattern: /^\/api\/chromatic-aberration\/circle-motion-blur\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return circleMotionBlur;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/chromatic-aberration\/liquid-distortion\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return liquidDistortion;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/chromatic-aberration\/circles\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return index$1;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/chromatic-aberration\/circles\/motion-blur\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return motionBlur;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/chromatic-aberration\/circle\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return circle;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/basic\/centered-circle\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return centeredCircle;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/noise\/noise-1\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return noise1;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/noise\/noise-2\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return noise2;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/api\/math\/impulse-function\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return impulseFunction;
      })
    },
    {
      type: "page",
      pattern: /^(?:\/(.*))?\/?$/,
      params: (m) => ({ path: d(m[1] || "") }),
      a: [".svelte-kit/build/components/layout.svelte", "src/routes/[...path].svelte"],
      b: ["src/routes/__error.svelte"]
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
  externalFetch: hooks.externalFetch || fetch
});
var module_lookup = {
  ".svelte-kit/build/components/layout.svelte": () => Promise.resolve().then(function() {
    return layout;
  }),
  "src/routes/__error.svelte": () => Promise.resolve().then(function() {
    return __error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index;
  }),
  "src/routes/[...path].svelte": () => Promise.resolve().then(function() {
    return ____path_;
  })
};
var metadata_lookup = { ".svelte-kit/build/components/layout.svelte": { "entry": "layout.svelte-716f2196.js", "css": [], "js": ["layout.svelte-716f2196.js", "chunks/vendor-13fc10bd.js"], "styles": [] }, "src/routes/__error.svelte": { "entry": "pages/__error.svelte-4919e77a.js", "css": ["assets/pages/__error.svelte-72627b38.css", "assets/Social-e5baa2b2.css"], "js": ["pages/__error.svelte-4919e77a.js", "chunks/vendor-13fc10bd.js", "chunks/HomeButton-39fe752d.js", "chunks/Social-3fa015f1.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-e0692c47.js", "css": ["assets/pages/index.svelte-61fa039b.css", "assets/ShaderList-5f6d73f3.css", "assets/Social-e5baa2b2.css"], "js": ["pages/index.svelte-e0692c47.js", "chunks/vendor-13fc10bd.js", "chunks/ShaderList-19400f32.js", "chunks/Social-3fa015f1.js"], "styles": [] }, "src/routes/[...path].svelte": { "entry": "pages/[...path].svelte-c01e8950.js", "css": ["assets/pages/[...path].svelte-eaaaf860.css", "assets/ShaderList-5f6d73f3.css"], "js": ["pages/[...path].svelte-c01e8950.js", "chunks/vendor-13fc10bd.js", "chunks/HomeButton-39fe752d.js", "chunks/ShaderList-19400f32.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender });
}
var glsl = (x) => x.join("");
var shader = (body) => () => ({ status: 200, body });
var frag$8 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

float rect(vec2 coord, vec2 dimensions, vec2 offset) {
  vec2 shaper = step(offset, coord);
  shaper *= step(coord, offset + dimensions);

  return shaper.x * shaper.y;
}

float segment(vec2 P, vec2 A, vec2 B, float r) {
  vec2 g = B - A;
  vec2 h = P - A;
  float d = length(h - g * clamp(dot(g, h) / dot(g, g), 0.0, 1.0));
  return smoothstep(r, 0.5 * r, d);
}

vec3 scene(vec2 st, float time) {

  vec3 col = vec3(0);

  vec2 pos1 = vec2(cos(time * 5.), sin(time * 3.)) * 0.5;
  col = mix(col, vec3(1.), circle(st + pos1, .01));

  vec2 pos2 = vec2(cos(time * 5.), sin(time + cos(time) * 10.)) * 0.5;
  col = mix(col, vec3(1.), rect(st, vec2(0.15), pos2));

  col = mix(col, vec3(1.),
            segment(st, -pos1 * 2., pos2 * 2. + vec2(0.15 / 2.), .03));
  return col;
}

#define CA_OFF .0075
#define BM_OFF CA_OFF
#define BM_STEPS 5.

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  for (float i = 0.; i < BM_STEPS; i++) {

    float t = u_time;
    // t *= .9;
    float bm_time = t - i * BM_OFF;
    vec3 ab = vec3(0.);
    // CHROMATIC ABERRATION
    ab += vec3(1., 0., 0.) * scene(st, bm_time);
    ab += vec3(0., 1., 0.) * scene(st, bm_time - CA_OFF);
    ab += vec3(0., 0., 1.) * scene(st, bm_time - CA_OFF * 2.);

    col = mix(ab, col, i / BM_STEPS);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
var get$8 = shader({ frag: frag$8 });
var circleMotionBlur = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$8
});
var frag$7 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926538
#define TAU 6.2831853076

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

vec3 scene(vec2 st, float time) {

  vec3 col = vec3(0.);

  st *= 10.;
  col += circle((fract(st + cos(time - st)) - 0.5) * 2., .5) * vec3(1.);

  return col;
}

#define OFF 0.025

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  // CHROMATIC ABERRATION
  col += vec3(1., 0., 0.) * scene(st, u_time);
  col += vec3(0., 1., 0.) * scene(st, u_time - OFF);
  col += vec3(0., 0., 1.) * scene(st, u_time - OFF * 2.);

  gl_FragColor = vec4(col, 1.0);
}
`;
var get$7 = shader({ frag: frag$7 });
var liquidDistortion = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$7
});
var frag$6 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926538
#define TAU 6.2831853076

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

float impulse(in float st) {

  st = pow(cos(st + sin(st * .4)), 31.) + sin(st * 2.) * .5;
  return st;
}

vec3 scene(vec2 st, float time) {

  vec3 col = vec3(0.);

  float r = length(st);
  float angle = (atan(st.y, st.x));
  float speed = 2.;

  float r_off = impulse(r * 2. - time * speed);

  r += r_off * 0.03;

  st.x = r * cos(angle);
  st.y = r * sin(angle);

  st *= 15.;

  st = fract(st);
  col += circle((st - 0.5) * 4., 1.);

  // return vec3(r_off);
  return col;
}

#define OFF .04

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  // CHROMATIC ABERRATION
  col += vec3(1., 0., 0.) * scene(st, u_time);
  col += vec3(0., 1., 0.) * scene(st, u_time - OFF);
  col += vec3(0., 0., 1.) * scene(st, u_time - OFF * 2.);

  gl_FragColor = vec4(col, 1.0);
}
`;
var get$6 = shader({ frag: frag$6 });
var index$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$6
});
var frag$5 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926538
#define TAU 6.2831853076

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

float impulse(in float st) {

  st = pow(cos(st + sin(st * .4)), 31.) + sin(st * 2.) * .5;
  return st;
}

vec3 scene(vec2 st, float time) {

  vec3 col = vec3(0.);

  float r = length(st);
  float angle = (atan(st.y, st.x));
  float speed = 2.;

  float r_off = impulse(r * 2. - time * speed);

  r += r_off * 0.03;

  st.x = r * cos(angle);
  st.y = r * sin(angle);

  st *= 15.;

  st = fract(st);
  col += circle((st - 0.5) * 4., 1.);

  // return vec3(r_off);
  return col;
}

#define CA_OFF .04
#define BM_OFF CA_OFF
#define BM_STEPS 5.

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  float t = u_time;
  // t *= 0.1;

  for (float i = 0.; i < BM_STEPS; i++) {

    vec3 ab = vec3(0.);
    // CHROMATIC ABERRATION
    ab += vec3(1., 0., 0.) * scene(st, t + i * BM_OFF);
    ab += vec3(0., 1., 0.) * scene(st, t - CA_OFF + i * BM_OFF);
    ab += vec3(0., 0., 1.) * scene(st, t - CA_OFF * 2. + i * BM_OFF);

    col = mix(ab, col, i / BM_STEPS);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
var get$5 = shader({ frag: frag$5 });
var motionBlur = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$5
});
var frag$4 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

vec3 scene(vec2 st, float time) {
  vec2 pos = vec2(cos(time * 5.), sin(time * 3.)) * 0.5;
  vec3 col = circle(st + pos, .01) * vec3(1.);

  return col;
}

#define OFF 0.005

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  // CHROMATIC ABERRATION
  col += vec3(1., 0., 0.) * scene(st, u_time);
  col += vec3(0., 1., 0.) * scene(st, u_time - OFF);
  col += vec3(0., 0., 1.) * scene(st, u_time - OFF * 2.);

  gl_FragColor = vec4(col, 1.0);
}
`;
var get$4 = shader({ frag: frag$4 });
var circle = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$4
});
var frag$3 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

float square(vec2 _st, float side) {
  return step(-side / 2., _st.x) * step(_st.x, side / 2.);
}

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(.75);

  col.x = mix(0., 1., fract(st.x));
  col.y = mix(0., 1., fract(st.y));

  col += circle(st, 2.);
  gl_FragColor = vec4(col, 1.0);
}
`;
var get$3 = shader({ frag: frag$3 });
var centeredCircle = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$3
});
var frag$2 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec4 permute(vec4 x) { return mod(((x * 34.) + 1.) * x, 289.); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - .85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1. / 6., 1. / 3.);
  const vec4 D = vec4(0., .5, 1., 2.);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  //  x0 = x0 - 0. + 0.0 * C
  vec3 x1 = x0 - i1 + 1. * C.xxx;
  vec3 x2 = x0 - i2 + 2. * C.xxx;
  vec3 x3 = x0 - 1. + 3. * C.xxx;

  // Permutations
  i = mod(i, 289.);
  vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y +
                           vec4(0., i1.y, i2.y, 1.)) +
                   i.x + vec4(0., i1.x, i2.x, 1.));

  // Gradients
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1. / 7.; // N=7
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49. * floor(p * ns.z * ns.z); //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7. * x_); // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1. - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2. + 1.;
  vec4 s1 = floor(b1) * 2. + 1.;
  vec4 sh = -step(h, vec4(0.));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm =
      taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m =
      max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.);
  m = m * m;
  return 42. *
         dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float bell(float v, float a, float b) {
  return smoothstep(a, (b + a) / 2., v) - smoothstep((b + a) / 2., b, v);
}

float block(float from, float to, float i) {
  return (smoothstep(from, (from + to) / 2., i) -
          smoothstep((from + to) / 2., to, i)) *
         .7;
}
vec3 palette(float i) {
  i *= 4.;
  vec3 col;
  col += block(-1., 2., i) * vec3(1., 0., .9176);
  col += block(0., 3., i) * vec3(.8157, .9804, .3647);
  col += block(1., 4., i) * vec3(0., .9333, 1.);
  col += block(2., 5., i) * vec3(1., .9333, 0.);

  return col;
}

float nonoise(vec3 v) {
  float n = snoise(vec3(v.xy * 4., v.z * .04));
  float amplified = n * 3.;
  float fr = fract(amplified);

  float big = sin(snoise(vec3(v.yx, u_time * .25))) * 10.;
  float normBig = (step(.5, big) + bell(big, .1, .9));
  float m = bell(fr * normBig, .0, .1);

  return m;
}

vec3 colnoise(vec3 v) {
  vec3 res;

  float coeff = .075;
  res.x = nonoise(vec3(v.xy, v.z));
  res.y = nonoise(vec3(v.xy, v.z + coeff));
  res.z = nonoise(vec3(v.xy, v.z + coeff * 2.));

  res = palette(nonoise(v));
  return res;
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;

  vec3 n = colnoise(vec3(st, u_time));

  gl_FragColor = vec4(n, 1.);

  vec3 col = palette((snoise(vec3(st, u_time * .124) * 4.)));

  gl_FragColor =
      vec4(palette(fract((snoise(vec3(st * 10., u_time * .1))) * 3.)), 1.);

  // gl_FragColor=vec4(palette(st.x),1.);
}
`;
var get$2 = shader({ frag: frag$2 });
var noise1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$2
});
var frag$1 = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec4 permute(vec4 x) { return mod(((x * 34.) + 1.) * x, 289.); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - .85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1. / 6., 1. / 3.);
  const vec4 D = vec4(0., .5, 1., 2.);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  //  x0 = x0 - 0. + 0.0 * C
  vec3 x1 = x0 - i1 + 1. * C.xxx;
  vec3 x2 = x0 - i2 + 2. * C.xxx;
  vec3 x3 = x0 - 1. + 3. * C.xxx;

  // Permutations
  i = mod(i, 289.);
  vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y +
                           vec4(0., i1.y, i2.y, 1.)) +
                   i.x + vec4(0., i1.x, i2.x, 1.));

  // Gradients
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1. / 7.; // N=7
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49. * floor(p * ns.z * ns.z); //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7. * x_); // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1. - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2. + 1.;
  vec4 s1 = floor(b1) * 2. + 1.;
  vec4 sh = -step(h, vec4(0.));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm =
      taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m =
      max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.);
  m = m * m;
  return 42. *
         dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;

  float n = snoise(vec3(st * 4., u_time * .04));
  float fr = fract(n * 3.);

  float n2 = snoise(vec3(st * 40., u_time * .5));
  float fr2 = fract(n2 * 2.);

  float m = 1. - smoothstep(fr + fr2, .2, .1);

  gl_FragColor = vec4(vec3(.5725, 1., .9294) * m, 1.);
}`;
var get$1 = shader({ frag: frag$1 });
var noise2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$1
});
var frag = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float plot(vec2 st) { return smoothstep(0.02, 0.0, abs(st.y - st.x)); }

vec3 draw(in vec2 st, in vec3 color, inout vec3 bg) {
  bg = mix(bg, color, plot(st));
  return bg;
}

vec2 fn1(in vec2 st) {

  st.x = cos(st.x + sin(st.x)) * 0.5 + 0.5;
  return st;
}

vec2 fn2(in vec2 st) {

  st.x = pow(cos(st.x), 4.);
  return st;
}

vec2 fn3(in vec2 st) {

  st.x = pow(cos(st.x + sin(st.x)) * 0.5 + 0.5, 20.);
  return st;
}

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  st *= 2.;
  // AXES
  draw(vec2(0., st.y), vec3(0.4392, 0.4392, 0.4392), col);
  draw(vec2(1., st.y), vec3(0.1529, 0.1529, 0.1529), col);
  draw(vec2(st.x, 0), vec3(0.4392, 0.4392, 0.4392), col);

  st.x += u_time;

  // PLOT
  draw(fn1(st), vec3(0.0431, 1.0, 0.7922), col);
  draw(fn2(st), vec3(1.0, 0.0431, 0.9529), col);
  draw(fn3(st), vec3(0.9059, 1.0, 0.0431), col);

  gl_FragColor = vec4(col, 1.0);
}
`;
var get = shader({ frag });
var impulseFunction = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get
});
var Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${slots.default ? slots.default({}) : ``}`;
});
var layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Layout
});
var HomeButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<a href="${"/"}">\u2190 Home</a>`;
});
var GithubIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = 32 } = $$props;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  return `<svg${add_attribute("height", size, 0)} aria-hidden="${"true"}" viewBox="${"0 0 16 16"}" version="${"1.1"}"${add_attribute("width", size, 0)} data-view-component="${"true"}"><path fill="${"currentColor"}" fill-rule="${"evenodd"}" d="${"M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"}"></path></svg>`;
});
var TwitterIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = 32 } = $$props;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  return `<svg${add_attribute("width", size, 0)}${add_attribute("height", size, 0)} viewBox="${"0 0 24 24"}" aria-hidden="${"true"}"><g><path fill="${"currentColor"}" d="${"M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"}"></path></g></svg>`;
});
var css$5 = {
  code: ".social.svelte-2ze01s.svelte-2ze01s.svelte-2ze01s{font-size:0.875rem;display:flex;align-items:center;justify-content:center}.social.svelte-2ze01s .svelte-2ze01s.svelte-2ze01s{color:#aaa}.social.svelte-2ze01s a.svelte-2ze01s.svelte-2ze01s{transition:color 0.3s}.social.svelte-2ze01s a.svelte-2ze01s.svelte-2ze01s:hover{color:var(--text-color)}@media(hover: none){.social.svelte-2ze01s a.svelte-2ze01s.svelte-2ze01s{color:var(--text-color)}}.social.svelte-2ze01s>.svelte-2ze01s+.svelte-2ze01s{margin-left:0.5rem}.icon.svelte-2ze01s.svelte-2ze01s.svelte-2ze01s{display:flex;cursor:pointer}",
  map: `{"version":3,"file":"Social.svelte","sources":["Social.svelte"],"sourcesContent":["<script>\\n  import GithubIcon from '../svg/GithubIcon.svelte'\\n  import TwitterIcon from '../svg/TwitterIcon.svelte'\\n<\/script>\\n\\n<div class=\\"social\\">\\n  <div>Ivan Rossi</div>\\n  <a class=\\"icon\\" href=\\"https://github.com/ivanross\\" target=\\"__blank\\">\\n    <GithubIcon size={20} />\\n  </a>\\n  <a class=\\"icon\\" href=\\"https://twitter.com/IvanRossi95\\" target=\\"__blank\\">\\n    <TwitterIcon size={20} />\\n  </a>\\n</div>\\n\\n<style>\\n  .social {\\n    font-size: 0.875rem;\\n    display: flex;\\n    align-items: center;\\n    justify-content: center;\\n  }\\n\\n  .social * {\\n    color: #aaa;\\n  }\\n\\n  .social a {\\n    transition: color 0.3s;\\n  }\\n\\n  .social a:hover {\\n    color: var(--text-color);\\n  }\\n\\n  @media (hover: none) {\\n    .social a {\\n      color: var(--text-color);\\n    }\\n  }\\n\\n  .social > * + * {\\n    margin-left: 0.5rem;\\n  }\\n\\n  .icon {\\n    display: flex;\\n    cursor: pointer;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAgBE,OAAO,0CAAC,CAAC,AACP,SAAS,CAAE,QAAQ,CACnB,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,MAAM,CACnB,eAAe,CAAE,MAAM,AACzB,CAAC,AAED,qBAAO,CAAC,4BAAE,CAAC,AACT,KAAK,CAAE,IAAI,AACb,CAAC,AAED,qBAAO,CAAC,CAAC,4BAAC,CAAC,AACT,UAAU,CAAE,KAAK,CAAC,IAAI,AACxB,CAAC,AAED,qBAAO,CAAC,6BAAC,MAAM,AAAC,CAAC,AACf,KAAK,CAAE,IAAI,YAAY,CAAC,AAC1B,CAAC,AAED,MAAM,AAAC,QAAQ,IAAI,CAAC,AAAC,CAAC,AACpB,qBAAO,CAAC,CAAC,4BAAC,CAAC,AACT,KAAK,CAAE,IAAI,YAAY,CAAC,AAC1B,CAAC,AACH,CAAC,AAED,qBAAO,CAAG,cAAC,CAAG,cAAE,CAAC,AACf,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,KAAK,0CAAC,CAAC,AACL,OAAO,CAAE,IAAI,CACb,MAAM,CAAE,OAAO,AACjB,CAAC"}`
};
var Social = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$5);
  return `<div class="${"social svelte-2ze01s"}"><div class="${"svelte-2ze01s"}">Ivan Rossi</div>
  <a class="${"icon svelte-2ze01s"}" href="${"https://github.com/ivanross"}" target="${"__blank"}">${validate_component(GithubIcon, "GithubIcon").$$render($$result, { size: 20 }, {}, {})}</a>
  <a class="${"icon svelte-2ze01s"}" href="${"https://twitter.com/IvanRossi95"}" target="${"__blank"}">${validate_component(TwitterIcon, "TwitterIcon").$$render($$result, { size: 20 }, {}, {})}</a>
</div>`;
});
var css$4 = {
  code: ".wrapper.svelte-10nnxes{width:100%;height:100%;display:flex;justify-content:center;align-items:center;flex-direction:column}.content.svelte-10nnxes{height:100%;flex:1 1 auto;display:flex;justify-content:center;align-items:start;flex-direction:column}.footer.svelte-10nnxes{margin:1rem}.title.svelte-10nnxes{font-size:5rem}.subtitle.svelte-10nnxes{font-size:1.25rem;margin-bottom:2rem;color:#777;max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.subtitle.svelte-10nnxes i{color:#ddd;text-decoration:line-through}",
  map: `{"version":3,"file":"__error.svelte","sources":["__error.svelte"],"sourcesContent":["<script context=\\"module\\">\\n  export function load({ error, status }) {\\n    return {\\n      props: { error, status },\\n    }\\n  }\\n<\/script>\\n\\n<script>\\n  import HomeButton from '../components/HomeButton.svelte'\\n  import Social from '../components/Social.svelte'\\n\\n  export let status\\n  export let error\\n\\n  $: {\\n    console.groupCollapsed('Error')\\n    console.log('status', status)\\n    console.log('error', error)\\n    console.groupEnd()\\n  }\\n<\/script>\\n\\n<div class=\\"wrapper\\">\\n  <div class=\\"content\\">\\n    <strong class=\\"title\\">{status}</strong>\\n    <div class=\\"subtitle\\">{@html error.message}</div>\\n    <HomeButton />\\n  </div>\\n\\n  <div class=\\"footer\\">\\n    <Social />\\n  </div>\\n</div>\\n\\n<style>\\n  .wrapper {\\n    width: 100%;\\n    height: 100%;\\n    display: flex;\\n    justify-content: center;\\n    align-items: center;\\n    flex-direction: column;\\n  }\\n\\n  .content {\\n    height: 100%;\\n    flex: 1 1 auto;\\n    display: flex;\\n    justify-content: center;\\n    align-items: start;\\n    flex-direction: column;\\n  }\\n  .footer {\\n    margin: 1rem;\\n  }\\n\\n  .title {\\n    font-size: 5rem;\\n  }\\n\\n  .subtitle {\\n    font-size: 1.25rem;\\n    margin-bottom: 2rem;\\n    color: #777;\\n\\n    max-width: 80vw;\\n    white-space: nowrap;\\n    overflow: hidden;\\n    text-overflow: ellipsis;\\n  }\\n\\n  .subtitle :global(i) {\\n    color: #ddd;\\n    text-decoration: line-through;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAoCE,QAAQ,eAAC,CAAC,AACR,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,CACnB,cAAc,CAAE,MAAM,AACxB,CAAC,AAED,QAAQ,eAAC,CAAC,AACR,MAAM,CAAE,IAAI,CACZ,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,KAAK,CAClB,cAAc,CAAE,MAAM,AACxB,CAAC,AACD,OAAO,eAAC,CAAC,AACP,MAAM,CAAE,IAAI,AACd,CAAC,AAED,MAAM,eAAC,CAAC,AACN,SAAS,CAAE,IAAI,AACjB,CAAC,AAED,SAAS,eAAC,CAAC,AACT,SAAS,CAAE,OAAO,CAClB,aAAa,CAAE,IAAI,CACnB,KAAK,CAAE,IAAI,CAEX,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,MAAM,CACnB,QAAQ,CAAE,MAAM,CAChB,aAAa,CAAE,QAAQ,AACzB,CAAC,AAED,wBAAS,CAAC,AAAQ,CAAC,AAAE,CAAC,AACpB,KAAK,CAAE,IAAI,CACX,eAAe,CAAE,YAAY,AAC/B,CAAC"}`
};
function load$1({ error: error2, status }) {
  return { props: { error: error2, status } };
}
var _error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error2 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  $$result.css.add(css$4);
  {
    {
      console.groupCollapsed("Error");
      console.log("status", status);
      console.log("error", error2);
      console.groupEnd();
    }
  }
  return `<div class="${"wrapper svelte-10nnxes"}"><div class="${"content svelte-10nnxes"}"><strong class="${"title svelte-10nnxes"}">${escape(status)}</strong>
    <div class="${"subtitle svelte-10nnxes"}"><!-- HTML_TAG_START -->${error2.message}<!-- HTML_TAG_END --></div>
    ${validate_component(HomeButton, "HomeButton").$$render($$result, {}, {}, {})}</div>

  <div class="${"footer svelte-10nnxes"}">${validate_component(Social, "Social").$$render($$result, {}, {}, {})}</div>
</div>`;
});
var __error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _error,
  load: load$1
});
var css$3 = {
  code: "a.svelte-1vkqeil>div.svelte-1vkqeil{padding:0.5rem 1rem}div.svelte-1vkqeil.svelte-1vkqeil:not(.isActive){color:var(--text-color)}.prefix.svelte-1vkqeil.svelte-1vkqeil{opacity:0.6}",
  map: `{"version":3,"file":"ShaderListItem.svelte","sources":["ShaderListItem.svelte"],"sourcesContent":["<script>\\n  export let href\\n  export let isActive = false\\n\\n  const splitted = href.split('/')\\n  const prefix = splitted.slice(0, splitted.length - 1).join('/')\\n  const filename = splitted[splitted.length - 1]\\n<\/script>\\n\\n<a href={\`/\${href}\`}>\\n  <div class:isActive>\\n    {#if prefix}<span class=\\"prefix\\">{prefix}/</span>{/if}<span>{filename}</span>\\n\\n    {#if isActive}<span>&#8592;</span>{/if}\\n  </div>\\n</a>\\n\\n<style>\\n  a > div {\\n    padding: 0.5rem 1rem;\\n  }\\n\\n  div:not(.isActive) {\\n    color: var(--text-color);\\n  }\\n  .prefix {\\n    opacity: 0.6;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAkBE,gBAAC,CAAG,GAAG,eAAC,CAAC,AACP,OAAO,CAAE,MAAM,CAAC,IAAI,AACtB,CAAC,AAED,iCAAG,KAAK,SAAS,CAAC,AAAC,CAAC,AAClB,KAAK,CAAE,IAAI,YAAY,CAAC,AAC1B,CAAC,AACD,OAAO,8BAAC,CAAC,AACP,OAAO,CAAE,GAAG,AACd,CAAC"}`
};
var ShaderListItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href } = $$props;
  let { isActive = false } = $$props;
  const splitted = href.split("/");
  const prefix = splitted.slice(0, splitted.length - 1).join("/");
  const filename = splitted[splitted.length - 1];
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.isActive === void 0 && $$bindings.isActive && isActive !== void 0)
    $$bindings.isActive(isActive);
  $$result.css.add(css$3);
  return `<a${add_attribute("href", `/${href}`, 0)} class="${"svelte-1vkqeil"}"><div class="${["svelte-1vkqeil", isActive ? "isActive" : ""].join(" ").trim()}">${prefix ? `<span class="${"prefix svelte-1vkqeil"}">${escape(prefix)}/</span>` : ``}<span>${escape(filename)}</span>

    ${isActive ? `<span>\u2190</span>` : ``}</div>
</a>`;
});
var data = [
  "basic/centered-circle",
  "chromatic-aberration/circle-motion-blur",
  "chromatic-aberration/circle",
  "chromatic-aberration/circles",
  "chromatic-aberration/circles/motion-blur",
  "chromatic-aberration/liquid-distortion",
  "math/impulse-function",
  "noise/noise-1",
  "noise/noise-2"
];
var css$2 = {
  code: ".wrapper.svelte-1h5tqch{background-color:var(--list-bg-color);min-height:100%;width:100%}",
  map: `{"version":3,"file":"ShaderList.svelte","sources":["ShaderList.svelte"],"sourcesContent":["<script>\\n  import ShaderListItem from './ShaderListItem.svelte'\\n  import data from '../shaders-list'\\n\\n  export let src\\n<\/script>\\n\\n<div class=\\"wrapper\\">\\n  {#each data as href}\\n    <ShaderListItem {href} isActive={href === src} />\\n  {/each}\\n</div>\\n\\n<style>\\n  .wrapper {\\n    background-color: var(--list-bg-color);\\n    min-height: 100%;\\n    width: 100%;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAcE,QAAQ,eAAC,CAAC,AACR,gBAAgB,CAAE,IAAI,eAAe,CAAC,CACtC,UAAU,CAAE,IAAI,CAChB,KAAK,CAAE,IAAI,AACb,CAAC"}`
};
var ShaderList = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { src: src2 } = $$props;
  if ($$props.src === void 0 && $$bindings.src && src2 !== void 0)
    $$bindings.src(src2);
  $$result.css.add(css$2);
  return `<div class="${"wrapper svelte-1h5tqch"}">${each(data, (href) => `${validate_component(ShaderListItem, "ShaderListItem").$$render($$result, { href, isActive: href === src2 }, {}, {})}`)}
</div>`;
});
var css$1 = {
  code: "div.svelte-1uvyqc8{background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent;background-image:linear-gradient(47deg, #00ffbd, #00dbff);background-size:400% 400%;-webkit-animation:svelte-1uvyqc8-gradient-rotation 3s ease infinite;animation:svelte-1uvyqc8-gradient-rotation 3s ease infinite}@-webkit-keyframes svelte-1uvyqc8-gradient-rotation{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes svelte-1uvyqc8-gradient-rotation{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}",
  map: '{"version":3,"file":"TextGradient.svelte","sources":["TextGradient.svelte"],"sourcesContent":["<div>\\n  <slot />\\n</div>\\n\\n<style>\\n  div {\\n    background-clip: text;\\n    -webkit-background-clip: text;\\n    color: transparent;\\n    -webkit-text-fill-color: transparent;\\n\\n    background-image: linear-gradient(47deg, #00ffbd, #00dbff);\\n    background-size: 400% 400%;\\n\\n    -webkit-animation: gradient-rotation 3s ease infinite;\\n    animation: gradient-rotation 3s ease infinite;\\n  }\\n\\n  @-webkit-keyframes gradient-rotation {\\n    0% {\\n      background-position: 0% 50%;\\n    }\\n    50% {\\n      background-position: 100% 50%;\\n    }\\n    100% {\\n      background-position: 0% 50%;\\n    }\\n  }\\n  @keyframes gradient-rotation {\\n    0% {\\n      background-position: 0% 50%;\\n    }\\n    50% {\\n      background-position: 100% 50%;\\n    }\\n    100% {\\n      background-position: 0% 50%;\\n    }\\n  }\\n</style>\\n"],"names":[],"mappings":"AAKE,GAAG,eAAC,CAAC,AACH,eAAe,CAAE,IAAI,CACrB,uBAAuB,CAAE,IAAI,CAC7B,KAAK,CAAE,WAAW,CAClB,uBAAuB,CAAE,WAAW,CAEpC,gBAAgB,CAAE,gBAAgB,KAAK,CAAC,CAAC,OAAO,CAAC,CAAC,OAAO,CAAC,CAC1D,eAAe,CAAE,IAAI,CAAC,IAAI,CAE1B,iBAAiB,CAAE,gCAAiB,CAAC,EAAE,CAAC,IAAI,CAAC,QAAQ,CACrD,SAAS,CAAE,gCAAiB,CAAC,EAAE,CAAC,IAAI,CAAC,QAAQ,AAC/C,CAAC,AAED,mBAAmB,gCAAkB,CAAC,AACpC,EAAE,AAAC,CAAC,AACF,mBAAmB,CAAE,EAAE,CAAC,GAAG,AAC7B,CAAC,AACD,GAAG,AAAC,CAAC,AACH,mBAAmB,CAAE,IAAI,CAAC,GAAG,AAC/B,CAAC,AACD,IAAI,AAAC,CAAC,AACJ,mBAAmB,CAAE,EAAE,CAAC,GAAG,AAC7B,CAAC,AACH,CAAC,AACD,WAAW,gCAAkB,CAAC,AAC5B,EAAE,AAAC,CAAC,AACF,mBAAmB,CAAE,EAAE,CAAC,GAAG,AAC7B,CAAC,AACD,GAAG,AAAC,CAAC,AACH,mBAAmB,CAAE,IAAI,CAAC,GAAG,AAC/B,CAAC,AACD,IAAI,AAAC,CAAC,AACJ,mBAAmB,CAAE,EAAE,CAAC,GAAG,AAC7B,CAAC,AACH,CAAC"}'
};
var TextGradient = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$1);
  return `<div class="${"svelte-1uvyqc8"}">${slots.default ? slots.default({}) : ``}
</div>`;
});
var css = {
  code: ".error.svelte-1ffml66.svelte-1ffml66{text-decoration:#ff555d wavy underline}main.svelte-1ffml66.svelte-1ffml66{width:100%;height:100%;display:flex;flex-direction:column}.title-wrapper.svelte-1ffml66.svelte-1ffml66{text-align:center;min-height:200px;padding:0 2rem;display:flex;flex-direction:column;justify-content:center;align-items:center}.title-content.svelte-1ffml66.svelte-1ffml66{height:100%;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;align-items:center}.title.svelte-1ffml66.svelte-1ffml66{font-size:3rem;font-weight:bold}.select.svelte-1ffml66.svelte-1ffml66{flex:1 1 auto;margin:2rem 1rem;border-radius:10px;overflow:hidden;border-color:var(--separator-color);border-style:solid;border-width:1px;min-height:200px}.select.svelte-1ffml66>div.svelte-1ffml66{width:100%;height:100%;overflow-y:auto}@media(min-width: 768px){main.svelte-1ffml66.svelte-1ffml66{flex-direction:row}.title-wrapper.svelte-1ffml66.svelte-1ffml66{width:100%;flex:1 1 auto}.select.svelte-1ffml66.svelte-1ffml66{flex-shrink:0;width:350px;margin:0;border-radius:0;border-width:0 0 0 1px}.social.svelte-1ffml66.svelte-1ffml66{margin:1rem}}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script>\\n  import ShaderList from '../components/ShaderList.svelte'\\n  import Social from '../components/Social.svelte'\\n  import TextGradient from '../components/TextGradient.svelte'\\n<\/script>\\n\\n<svelte:head>\\n  <title>Shaders</title>\\n</svelte:head>\\n\\n<main>\\n  <div class=\\"title-wrapper\\">\\n    <div class=\\"title-content\\">\\n      <div class=\\"title\\">\\n        <TextGradient>SHADERS</TextGradient>\\n      </div>\\n      <div>\\n        A collection of shaders, experiments, tries and\\n        <span class=\\"error\\">erorrs</span>.\\n      </div>\\n    </div>\\n\\n    <div class=\\"social\\">\\n      <Social />\\n    </div>\\n  </div>\\n\\n  <div class=\\"select\\">\\n    <div>\\n      <ShaderList />\\n    </div>\\n  </div>\\n</main>\\n\\n<style>\\n  .error {\\n    text-decoration: #ff555d wavy underline;\\n  }\\n\\n  main {\\n    width: 100%;\\n    height: 100%;\\n    display: flex;\\n    flex-direction: column;\\n  }\\n\\n  .title-wrapper {\\n    text-align: center;\\n    min-height: 200px;\\n    padding: 0 2rem;\\n\\n    display: flex;\\n    flex-direction: column;\\n    justify-content: center;\\n    align-items: center;\\n  }\\n\\n  .title-content {\\n    height: 100%;\\n    flex: 1 1 auto;\\n    display: flex;\\n    flex-direction: column;\\n    justify-content: center;\\n    align-items: center;\\n  }\\n\\n  .title {\\n    font-size: 3rem;\\n    font-weight: bold;\\n  }\\n\\n  .select {\\n    flex: 1 1 auto;\\n    margin: 2rem 1rem;\\n    border-radius: 10px;\\n    overflow: hidden;\\n    border-color: var(--separator-color);\\n    border-style: solid;\\n    border-width: 1px;\\n    min-height: 200px;\\n  }\\n\\n  .select > div {\\n    width: 100%;\\n    height: 100%;\\n    overflow-y: auto;\\n  }\\n\\n  @media (min-width: 768px) {\\n    main {\\n      flex-direction: row;\\n    }\\n\\n    .title-wrapper {\\n      width: 100%;\\n      flex: 1 1 auto;\\n    }\\n    .select {\\n      flex-shrink: 0;\\n      width: 350px;\\n      margin: 0;\\n      border-radius: 0;\\n      border-width: 0 0 0 1px;\\n    }\\n\\n    .social {\\n      margin: 1rem;\\n    }\\n  }\\n</style>\\n"],"names":[],"mappings":"AAmCE,MAAM,8BAAC,CAAC,AACN,eAAe,CAAE,OAAO,CAAC,IAAI,CAAC,SAAS,AACzC,CAAC,AAED,IAAI,8BAAC,CAAC,AACJ,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,AACxB,CAAC,AAED,cAAc,8BAAC,CAAC,AACd,UAAU,CAAE,MAAM,CAClB,UAAU,CAAE,KAAK,CACjB,OAAO,CAAE,CAAC,CAAC,IAAI,CAEf,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,cAAc,8BAAC,CAAC,AACd,MAAM,CAAE,IAAI,CACZ,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,MAAM,8BAAC,CAAC,AACN,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,IAAI,AACnB,CAAC,AAED,OAAO,8BAAC,CAAC,AACP,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CACd,MAAM,CAAE,IAAI,CAAC,IAAI,CACjB,aAAa,CAAE,IAAI,CACnB,QAAQ,CAAE,MAAM,CAChB,YAAY,CAAE,IAAI,iBAAiB,CAAC,CACpC,YAAY,CAAE,KAAK,CACnB,YAAY,CAAE,GAAG,CACjB,UAAU,CAAE,KAAK,AACnB,CAAC,AAED,sBAAO,CAAG,GAAG,eAAC,CAAC,AACb,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,IAAI,AAClB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AACzB,IAAI,8BAAC,CAAC,AACJ,cAAc,CAAE,GAAG,AACrB,CAAC,AAED,cAAc,8BAAC,CAAC,AACd,KAAK,CAAE,IAAI,CACX,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,AAChB,CAAC,AACD,OAAO,8BAAC,CAAC,AACP,WAAW,CAAE,CAAC,CACd,KAAK,CAAE,KAAK,CACZ,MAAM,CAAE,CAAC,CACT,aAAa,CAAE,CAAC,CAChB,YAAY,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,AACzB,CAAC,AAED,OAAO,8BAAC,CAAC,AACP,MAAM,CAAE,IAAI,AACd,CAAC,AACH,CAAC"}`
};
var Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `${$$result.head += `${$$result.title = `<title>Shaders</title>`, ""}`, ""}

<main class="${"svelte-1ffml66"}"><div class="${"title-wrapper svelte-1ffml66"}"><div class="${"title-content svelte-1ffml66"}"><div class="${"title svelte-1ffml66"}">${validate_component(TextGradient, "TextGradient").$$render($$result, {}, {}, { default: () => `SHADERS` })}</div>
      <div>A collection of shaders, experiments, tries and
        <span class="${"error svelte-1ffml66"}">erorrs</span>.
      </div></div>

    <div class="${"social svelte-1ffml66"}">${validate_component(Social, "Social").$$render($$result, {}, {}, {})}</div></div>

  <div class="${"select svelte-1ffml66"}"><div class="${"svelte-1ffml66"}">${validate_component(ShaderList, "ShaderList").$$render($$result, {}, {}, {})}</div></div>
</main>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes
});
var pass = glsl`

precision mediump float;
attribute vec2 position;
void main() { gl_Position = vec4(position, 0, 1); }`;
async function load({ page, fetch: fetch2 }) {
  const src2 = page.params.path;
  const url = `/api/${src2}`;
  const res = await fetch2(url);
  if (res.ok)
    return { props: { ...await res.json(), src: src2 } };
  return {
    status: res.status,
    error: `Shader <i>${src2}</i> not found`
  };
}
var U5B_pathu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { vert = pass } = $$props;
  let { frag: frag2 } = $$props;
  let { src: src2 } = $$props;
  if ($$props.vert === void 0 && $$bindings.vert && vert !== void 0)
    $$bindings.vert(vert);
  if ($$props.frag === void 0 && $$bindings.frag && frag2 !== void 0)
    $$bindings.frag(frag2);
  if ($$props.src === void 0 && $$bindings.src && src2 !== void 0)
    $$bindings.src(src2);
  return `${``}`;
});
var ____path_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5B_pathu5D,
  load
});

// .svelte-kit/vercel/entry.js
init();
var entry_default = async (req, res) => {
  const { pathname, searchParams } = new URL(req.url || "", "http://localhost");
  let body;
  try {
    body = await getRawBody(req);
  } catch (err) {
    res.statusCode = err.status || 400;
    return res.end(err.reason || "Invalid request body");
  }
  const rendered = await render({
    method: req.method,
    headers: req.headers,
    path: pathname,
    query: searchParams,
    rawBody: body
  });
  if (rendered) {
    const { status, headers, body: body2 } = rendered;
    return res.writeHead(status, headers).end(body2);
  }
  return res.writeHead(404).end();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
