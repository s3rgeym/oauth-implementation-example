'use strict'

import Sequelize from 'sequelize'
import crypto from 'crypto'
import { promisify } from 'util'

const { Op } = Sequelize

const passwordSaltBytes = parseInt(process.env.PASSWORD_SALT_BYTES) || 32
const passwordIterations = parseInt(process.env.PASSWORD_ITERATIONS) || 100000
const passwordKeyLength = parseInt(process.env.PASSWORD_KEY_LENGTH) || 64
const passwordDigest = process.env.PASSWORD_DIGEST || 'sha512'
// 2 недели
const passwordExpiresIn = parseInt(process.env.PASSWORD_EXPIRES_IN) || 1209600000

const randomBytesAsync = promisify(crypto.randomBytes)

const encryptPassword = (password, salt) =>
  promisify(crypto.pbkdf2)(
    password,
    salt,
    passwordIterations,
    passwordKeyLength,
    passwordDigest
  )

// TODO:
//
//   Если "Время изменения пароля" + "Время жизни куки" > "Текущей даты"; То
//     Сессия истекла
class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        username: {
          type: Sequelize.STRING,
          allowNull: false,
          // http://docs.sequelizejs.com/manual/models-definition.html#validations
          validate: {
            // Регулярку нужно посложнее придумать
            is: /^[-\w.]{3,255}$/
          }
        },
        firstName: {
          field: 'firstname',
          type: Sequelize.STRING,
          // allowNull: false,
          validate: {
            // Печатные символы, разделенные одним пробелом
            is: /^(?=.{1,255}$)(\S ?)*\S$/
          }
        },
        lastName: {
          field: 'lastname',
          type: Sequelize.STRING,
          // allowNull: false,
          validate: {
            is: /^(?=.{1,255}$)(\S ?)*\S$/
          }
        },
        fullName: {
          type: Sequelize.VIRTUAL,
          get() {
            // Возможно можно как то проще сделать
            return (
              this.getDataValue('firstName') +
              ' ' +
              this.getDataValue('lastName')
            )
          }
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          validate: {
            isEmail: true
          }
        },
        photo: {
          type: Sequelize.VIRTUAL,
          get() {
            // Когда мы отдаем JSON, то бинарные данные должны быть представлены в base64
            const data = this.getDataValue('photoData')
            return data ? data.encode('base64') : null
          },
          set(v) {
            this.setDataValue('photoData', Buffer.from(v, 'base64'))
          },
          // Как валидировать?
          // validate: {
          //   ...
          // }
        },
        photoData: {
          field: 'photo_data',
          type: Sequelize.BLOB,
          // Надо как-то валидировать
          // validate: {
          //   ...
          // }
        },
        password: {
          type: Sequelize.VIRTUAL,
          // Не может быть асинхронным, потому нужен хук
          set(v) {
            // Запускаем валидацию
            this.setDataValue('password', v)
          },
          validate: {
            min: [8, 255]
          }
        },
        passwordHash: {
          field: 'password_hash',
          type: Sequelize.BLOB,
          allowNull: false
        },
        passwordChanged: {
          field: 'password_changed',
          type: Sequelize.DATE,
          allowNull: false
        }
      },
      {
        tableName: 'users',
        schema: process.env.DATABASE_SCHEMA,
        indexes: [
          {
            unique: true,
            name: 'unique_username',
            fields: [sequelize.fn('lower', sequelize.col('username'))]
          },
          {
            unique: true,
            name: 'unique_email',
            fields: [sequelize.fn('lower', sequelize.col('email'))]
          }
        ],
        // Избавляемся от createdAt и updatedAt
        timestamps: false,
        hooks: {
          async beforeValidate(user) {
            if (user.changed('password')) {
              const salt = await randomBytesAsync(passwordSaltBytes)
              const hash = await encryptPassword(
                user.password,
                salt
              )
              user.passwordHash = Buffer.concat([salt, hash])
              user.passwordChanged = new Date()
            }
          }
        },
        sequelize
      }
    )
  }

  get isPasswordExpired() {
    return Date.now() > this.passwordChanged.getTime() + passwordExpiresIn
  }

  toJSON() {
    const attributes = Object.assign({}, this.get())
    // Скопы не всегда можно использовать, так как требуется проверка пароля
    if ('passwordHash' in attributes) {
      delete attributes.passwordHash
    }
    if ('photoData' in attributes) {
      delete attributes.photoData
    }
    return attributes
  }

  // static associate(models) {
  //   ...
  // }

  // https://sequelize.org/master/manual/scopes.html
  static loadScopes(models) {
    // Usage:
    //  User.scope('withoutEmail').findAll()
    this.addScope('withoutEmail', {
      attributes: {
        exclude: ['email']
      }
    })
  }

  static findByUsername(username) {
    // Ищем по логину или email
    return this.findOne({
      // WHERE (lower("username") = lower('tester') OR lower("email") = lower('tester'))
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('lower', Sequelize.col('username')),
            Sequelize.fn('lower', username)
          ),
          Sequelize.where(
            Sequelize.fn('lower', Sequelize.col('email')),
            Sequelize.fn('lower', username)
          )
        ]
      }
    })
  }

  async authenticate(password) {
    const salt = this.passwordHash.slice(0, passwordSaltBytes)
    const passwordHash = this.passwordHash.slice(passwordSaltBytes)
    const hash = await encryptPassword(password, salt)
    return passwordHash.equals(hash)
  }
}

export { User as default }
