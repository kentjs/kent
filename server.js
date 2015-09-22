var connect = require('express')
  //, gzip = require('connect-gzip')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , serveStatic = require('serve-static')
  , compose = require('./util/compose')
  , parse = require('url').parse

var Application = module.exports = function Application(options) {
	if (!(this instanceof Application)) 
		return new Application()

	this._connect = connect(options)
	//this._connect.use(gzip.gzip())
	this._stack = []
}

var app = Application.prototype

app.serve = function serve(directory, options) {
	var mountPath
	
	if(options && options.mount) {
		mountPath = options.mount
		delete options.mount
		this._connect.use(mountPath, serveStatic(directory, options))
	} else {
		this._connect.use(serveStatic(directory, options))
	}

	return this
}

app.connect = function connect(fn) {
	if(!this._defaults) {
		this._defaults = true
		this._connect.use(cookieParser())
		this._connect.use(bodyParser.urlencoded({ extended:true }))
	}

	if(this._stack.length) {
		throw new Error('All connect middleware (.connect) must be added before any kent middleware (.use)')
	}
	
	this._connect.use(fn)
	return this
}

app.use = function use(fn) {
	if(fn._stack) this._stack.push.apply(this._stack, fn._stack)
	else this._stack.push(fn)
	return this
}

app.listen = function listen() {
	var fn = compose(this._stack)
	this._connect.use(function(req, res, next) {
		fn.call(createContext(req, res), next)()
	})
	return this._connect.listen.apply(this._connect, arguments)
}

function createContext(req, res) {
	var ctx = {
		req,
		res,
		body:req.body,
		cookies:{
			get:function(name) { return req.cookies[name] },
			set:function(name, value, options) { res.cookie(name, value, options) }
		},
		redirect:function(url) {
			res.writeHead(302, { Location:url })
			res.end()
		},
		params:{}
	}

	var parsedUrl = parse(req.url, true)
	ctx.url = parsedUrl.path
	ctx.path = parsedUrl.pathname
	ctx.query = parsedUrl.query
	ctx.host = req.headers.host
	ctx.site = req.protocol+'://'+ctx.host
	ctx.href = ctx.site+parsedUrl.path

	return ctx
}