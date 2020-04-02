# OAuth2

О протоколе можно почитать [здесь](https://www.digitalocean.com/community/tutorials/oauth-2-ru).

# Развертывание

```bash
$ node --version
v10.16.0

$ npm --version
6.10.1

# Установка всех необходимых модулей
$ npm i

# Сборка проекта (компиляция через Babel)
$ npm run build

# После компиляции
$ npm run serve

# Запуск в режиме отладки через nodemon с hotreload (автоматически все компилирует)
$ npm run start
```

Настройки передаются через переменные окружения, например:

```bash
$ PORT=8001 npm run serve
```

Либо путем редактирования файла `.env` в корне проекта. В нем же содержится список всех используемых переменных окружения.

Настройки от базы:

```
DATABASE_NAME
DATABASE_USERNAME
DATABASE_PASSWORD
DATABASE_HOST
DATABASE_PORT
```

# Примеры

```bash
$ yay -S httpie

# Авторизация клиента (для микросервисов)
$ http :3000/auth/token grant_type=client_credentials client_id=1 client_secret='t0p$3cret'
HTTP/1.1 200 OK
Cache-Control: no-store
Connection: keep-alive
Content-Length: 591
Content-Type: application/json
Date: Tue, 06 Aug 2019 15:14:32 GMT
Pragma: no-cache
X-Powered-By: Express

{
    "access_token": "e97e77250f4d3cad8bf4428feae75a1eb60a8949316cd73dcb3236da63b36565106683f7eb0e9970ddb85af28077da93ebb930831be50dcb6865d8f2332a14145a0012e4fa80ce72664ceaf4ab2b8bd670bd3ee88935f4f80fa82416fe68b423e0fdb144857dd7d8169f80133e2ba5db5350242b738cc43fcaa4caa69527049",
    "expires_in": 3599,
    "refresh_token": "911c9615ceb029178ec18c88fc68301a29b72fec3de058e5856de156dbc60805c681ab1c744e946f768e2803b559efb75db0fdb58462153db046d228e89c3018cef382437385af93d7fb8b1ccbeb9c26598ae202e168883e3c77b2047c3916e46f695ad1fdd2144916eb4fc3a8ae3061ef318bb7c825a6a9ee5bb8913d9bee2",
    "token_type": "Bearer"
}

# CURL-аналог предыдущей команды:
$ curl http://localhost:3000/auth/token -X POST -H "Content-Type: application/json" -d '{"grant_type":"client_credentials","client_id":1,"client_secret":"t0p$3cret"}'
```

Обращение к методам API:

```bash
$ http :3000/users/me access_token==db1...
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 160
Content-Type: application/json; charset=utf-8
Date: Thu, 01 Aug 2019 17:27:13 GMT
ETag: W/"a0-CcFJco21WYGnou/RwrOU3pTpowk"
X-Powered-By: Express

{
    "email": "tester@example.com",
    "firstName": "John",
    "fullName": "John Doe",
    "id": 1,
    "lastName": "Doe",
    "passwordChanged": "2019-08-01T17:25:58.435Z",
    "username": "tester"
}
```

После истечения времени жизни access_token, необходимо получить новый, используя refresh_token:

```bash
$ http :3000/auth/token grant_type=refresh_token client_id=1 client_secret='t0p$3cret' refresh_token=911c9615ceb029178ec18c88fc68301a29b72fec3de058e5856de156dbc60805c681ab1c744e946f768e2803b559efb75db0fdb58462153db046d228e89c3018cef382437385af93d7fb8b1ccbeb9c26598ae202e168883e3c77b2047c3916e46f695ad1fdd2144916eb4fc3a8ae3061ef318bb7c825a6a9ee5bb8913d9bee2
HTTP/1.1 200 OK
Cache-Control: no-store
Connection: keep-alive
Content-Length: 591
Content-Type: application/json
Date: Tue, 06 Aug 2019 15:15:43 GMT
Pragma: no-cache
X-Powered-By: Express

{
    "access_token": "019fa1f885ae9a675160f22a55c56089dd39fd28a2b4947688ac2aeaf22e63c3fd7f87fe53591d8a8e9f6deed2bc3c07da176d953231acf8a3b26a42f37006ffbe9d1f0ca91cfecdde60e33153e479a1c186b637bc334f00e3e6d48411751ea6b80ea1999c724ae485cf707ef65be781f593aaa6b21352ef57fcec13522f56b",
    "expires_in": 3599,
    "refresh_token": "ef70aa29b30d767146938258317c9ce8e9f7daceb6f0ca01a6a45b2f07261456dbe66d2d3c9dfdf8b389af63db0dce269c0b9068001095403a21a3908f4e09fb0442a9d9381cbeecbb8253995378c3e1bffddca16fc19ede0ea4c47652b6f92fa34623618882dc4007e7ff721346292924e243fa8661bae7d4475a8386c6cd5",
    "token_type": "Bearer"
}

# refresh_token использовать можно только раз
$ http :3000/auth/token grant_type=refresh_token client_id=1 client_secret='t0p$3cret' refresh_token=911c9615ceb029178ec18c88fc68301a29b72fec3de058e5856de156dbc60805c681ab1c744e946f768e2803b559efb75db0fdb58462153db046d228e89c3018cef382437385af93d7fb8b1ccbeb9c26598ae202e168883e3c77b2047c3916e46f695ad1fdd2144916eb4fc3a8ae3061ef318bb7c825a6a9ee5bb8913d9bee2
HTTP/1.1 403 Forbidden
Connection: keep-alive
Content-Length: 69
Content-Type: application/json
Date: Tue, 06 Aug 2019 15:15:48 GMT
X-Powered-By: Express

{
    "error": "invalid_grant",
    "error_description": "Invalid refresh token"
}
```

# TODO

* Сделать вывод ошибок авторизации в JSON (-).
* Добавить сущности Client список разрешенных грантов (типов авторизации) (-).
* Добавить поддержку RefreshToken (+).
* ClientSecret нужно также криптовать?
