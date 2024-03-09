# Error page

I'm trying to serve this via nginx when the server is down but it aint' working.

Something to solve in the future.

```
error_page 502 etc /error.html;

location = /error.html {
    internal;
    root ...../public/;
}
```
