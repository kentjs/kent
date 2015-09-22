var match = require('path-match')()

var Router = module.exports = function Router(options) {
	if (!(this instanceof Router)) 
		return new Router()

	this._stack = []
}

var router = Router.prototype

router.use = function use(fn) {
	if(fn._stack) this._stack.push.apply(this._stack, fn._stack)
	else this._stack.push(fn)
	return this
}

router.on = function on(path, fn) {
	var param = match(path)

	this.use(function(next) {
		this.params = param(this.path)

		if(!this.params) {
			this.params = {}
			return next()
		}

		fn.call(this, next)
	})
}