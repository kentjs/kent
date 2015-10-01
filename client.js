var cookies = require('tiny-cookie')
  , compose = require('./util/compose')
  , parse = require('url').parse
  , resolve = require('url').resolve
  , ready = require('detect-dom-ready')
  , delegate = require('component-delegate')
  , serialize = require('form-serialize')

var Application = module.exports = function Application(options) {
	if (!(this instanceof Application)) 
		return new Application()

	this._stack = []
}

var app = Application.prototype

app.serve = function serve(directory, options) {
	throw new Error('app.serve() is only available on the server')
}

app.connect = function connect(fn) {
	throw new Error('app.connect() is only available on the server')
}

app.use = function use(fn) {
	if(fn._stack) this._stack.push.apply(this._stack, fn._stack)
	else this._stack.push(fn)
	return this
}

app.navigate = function navigate(url, body, redirect) {
	var absoluteUrl = resolve(window.location.href, url)

	if(absoluteUrl.indexOf(window.location.host) == -1) return

	var ctx = createContext(absoluteUrl, body)

	if(ctx.host != window.location.host) {
		return false
	}

	return new Promise(function(resolve, reject) {
		ctx.complete = function() {
			if(ctx.status && ctx.status >= 300 && ctx.status < 400) {
				return resolve(this.redirect(ctx.redirect))
			}

			if(ctx.href != window.location.href) {
				window.scrollTo(0, 0)

				if(redirect) {
					window.history.replaceState({}, '', ctx.href)
				} else {
					window.history.pushState({}, '', ctx.href)
				}
			}

			resolve(ctx)
		}.bind(this)

		this._fn.call(ctx, function(err) {
			if(err) {
				console.error(err.stack)
				reject(err)
			}
		})()
	}.bind(this))
}

app.submit = function submit(form) {
	var originalUrl = window.location.href
	  , url = form.action
	  , body

	if(form.method.toUpperCase() == 'POST') {
		body = serialize(form, { hash:true })
	} else {
		url += (form.action.indexOf('?') == -1 ? '?' : '&') + serialize(form)
	}

	return this.navigate(url, body).then(() => {
		if(form.method.toUpperCase() == 'POST' && originalUrl == window.location.href) {
			form.reset()
		}
	})
}

app.redirect = function redirect(url) {
	return this.navigate(url, undefined, true)
}

app.refresh = function refresh() {
	return this.redirect(window.location.href)
}

app.start = function listen() {
	this._fn = compose(this._stack)
	
	ready(() => {
		delgateFromDocument('a[href]', 'click', (e) => {
			var isLeftClick = e.buttons & 1
			
			if(isLeftClick && this.navigate(e.delegateTarget.href)) {
				e.stopPropagation()
				e.preventDefault()
				return false
			}
		})
		delgateFromDocument('form[action]', 'submit', (e) => {
			if(this.submit(e.delegateTarget)) {
				e.stopPropagation()
				e.preventDefault()
				return false
			}
		})
	})

	window.addEventListener('popstate', (e) => {
		if('state' in window.history && window.history.state !== null) this.refresh()
	})
}

function delgateFromDocument(selector, event, handler) {
	delegate.bind(document, selector, event, function(e) {
		if(!e.defaultPrevented) {
			return handler(e)
		}
	})
}

function createContext(url, body) {
	var ctx = {
		body,
		cookies,
		redirect:function(url) {
			this.status = 302
			this.redirect = url
			this.complete()
		},
		params:{}
	}

	var parsedUrl = parse(url, true)
	ctx.url = parsedUrl.path
	ctx.path = parsedUrl.pathname
	ctx.query = parsedUrl.query
	ctx.host = parsedUrl.host
	ctx.site = parsedUrl.protocol+(parsedUrl.slashes ? '//' : '')+parsedUrl.host
	ctx.href = parsedUrl.href

	return ctx
}