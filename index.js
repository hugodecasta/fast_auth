'use strict'

// ---------------------------------------------------- IMPORTS

const uuidv4 = require('uuid/v4')
const storage_class = require('storage')

// ---------------------------------------------------- INNER

class DataGroup {

    constructor(meta,data) {
        if(data === undefined) {
            this.tgroup = meta
        } else {
            this.tgroup = {meta,data}
        }
        this.save_method = function(){
            return false
        }
    }
    set_save_method(save_method) {
        this.save_method = save_method
    }

    // ----------------------------

    group() {
        return this.tgroup
    }

    meta() {
        return this.tgroup.meta
    }

    data() {
        return this.tgroup.data
    }

    // ----------------------------

    set(sub_gp,prop,value) {
        if(value === undefined) {
            delete sub_gp[prop]
            return this.save()
        }
        sub_gp[prop] = value
        return this.save()
    }

    set_meta(prop,value) {
        return this.set(this.meta(),prop,value)
    }

    set_data(prop,value) {
        return this.set(this.data(),prop,value)
    }

    // ----------------------------

    save() {
        return this.save_method()
    }

    // ----------------------------

    get(sub_gp,prop) {
        if(!(prop in sub_gp)) {
            return undefined
        }
        return sub_gp[prop]
    }

    get_meta(prop) {
        return this.get(this.meta(),prop)
    }

    get_data(prop) {
        return this.get(this.data(),prop)
    }
}

class FastAuth {

    constructor(auth_dir,prefix='',suffix='') {

        this.prefix = prefix
        this.suffix = suffix

        this.key_storage = new storage_class(auth_dir+'/keys')
        this.token_storage = new storage_class(auth_dir+'/tokens')
    }

    // ----------------------------- KEYS

    create_key(data,key=undefined) {
        key = key || this.prefix+uuidv4()+this.suffix
        if(this.get_key_data(key) != null) {
            return null
        }
        let key_data = new DataGroup({token:null,active:true},data)
        this.key_storage.write_key(key,key_data.group())
        return key
    }

    get_key_data(key) {
        if(!this.key_storage.key_exists(key)) {
            return null
        }
        let key_data = new DataGroup(this.key_storage.read_key(key))
        if(!key_data.get_meta('active')) {
            return null
        }
        let me = this
        key_data.set_save_method(function() {
            return me.key_storage.write_key(key,key_data.group())
        })
        return key_data
    }

    remove_key(key) {
        let key_data = this.get_key_data(key)
        if(key_data == null) {
            return false
        }
        if(key_data.get_meta('token') != null) {
            this.revoke_token(token)
        }
        this.key_storage.remove_key(key)
        return true
    }

    // --- key token

    key_token(key) {
        let key_data = this.get_key_data(key)
        if(key_data == null) {
            return null
        }
        let token = key_data.get_meta('token')
        if(this.get_token_data(token) != null) {
            return token
        }
        return null
    }

    set_token(key,token) {
        let key_data = this.get_key_data(key)
        if(key_data == null) {
            return null
        }
        key_data.set_meta('token',token)
        return key_data.save()
    }

    // ----------------------------- TOKEN

    // ---- connect / existance

    get_token(key,end_time) {
        let ex_token = this.key_token(key)
        if(this.get_token_data(ex_token) != null) {
            return ex_token
        }
        let token = 'token'+uuidv4()
        this.set_token(key,token)
        let key_data = this.get_key_data(key)
        let token_data = new DataGroup({key,end_time},key_data.data())
        this.token_storage.write_key(token,token_data.group())
        return token
    }

    get_token_data(token) {
        if(!this.token_storage.key_exists(token)) {
            return null
        }
        let token_data = new DataGroup(this.token_storage.read_key(token))
        let now = Date.now()
        let end_time = token_data.get_meta('end_time')
        if(now >= end_time) {
            this.revoke_token(token)
            return null
        }
        let me = this
        token_data.set_save_method(function() {
            return me.token_storage.write_key(token,token_data.group())
        })
        return token_data
    }

    // ---- get/set on token

    revoke_token(token) {
        if(!this.token_storage.key_exists(token)) {
            return false
        }
        let token_data = new DataGroup(this.token_storage.read_key(token))
        let key = token_data.get_meta('key')
        this.token_storage.remove_key(token)
        this.set_token(key,null)
        return true
    }

    extend_token(token, end_time) {
        let token_data = this.get_token_data(token)
        if(token_data == null) {
            return false
        }
        return token_data.set_meta('end_time',end_time)
    }

}

// ---------------------------------------------------- EXPORTS

module.exports = exports.FastAuth = FastAuth
