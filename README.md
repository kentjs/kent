# kent

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

heroic web framework for node.js and the browser

## Usage

[![NPM](https://nodei.co/npm/kent.png)](https://www.npmjs.com/package/kent)

```javascript

var kent = require('kent')
  , app = kent()

app.serve(__dirname + '/public')

app.connect(someConnectMiddleware())

app.use(function(next) {
	// kent-style middleware
})

```

## API

### Application

`app.serve(path[, options])` *server only*

`app.connect([mountPath, ]fn)` *server only*

`app.use(fn)`

`app.listen(port[, fn])` *server only*

`app.start()` *client only*

`app.navigate(url, body, redirect)` *client only*

`app.submit(form)` *client only*

`app.redirect(url)` *client only*

`app.refresh()` *client only*

### Router

`router.use(fn)`

`router.on(path, fn)`

## License

MIT, see [LICENSE.md](http://github.com/mlrawlings/kent/blob/master/LICENSE.md) for details.
