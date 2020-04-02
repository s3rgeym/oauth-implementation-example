'use strict'

import Sequelize from 'sequelize'

// const allowedGrantTypes = [
//   'authorization_code',
// ]

class Client extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: !1,
          primaryKey: !0,
          autoIncrement: !0
        },
        secret: {
          type: Sequelize.STRING,
          allowNull: !1,
          validate: {
            len: [8, 255]
          }
        },
        name: {
          type: Sequelize.STRING,
          allowNull: !1,
          validate: {
            is: /^(?=.{3,255}$)(\S ?)*\S$/
          }
        },
        description: {
          type: Sequelize.STRING(1023)
        },
        userId: {
          field: 'user_id',
          type: Sequelize.INTEGER
        },
        isConfidential: {
          field: 'is_confidential',
          type: Sequelize.BOOLEAN,
          allowNull: !1,
          defaultValue: !1
        },
        // TODO: сделать валидацию
        redirectUris: {
          field: 'redirect_uris',
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          validate: {
            // isArray: true
          }
        },
        redirectUri: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.getDataValue('redirectUris').join(' ')
          },
          set(v) {
            const matches = v.match(/[^\s,]+/g)
            this.setDataValue('redirectUris', matches)
          }
        },
        scopes: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          validate: {
            // isArray: true
          }
        },
        scope: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.getDataValue('scopes').join(' ')
          },
          set(v) {
            const matches = v.match(/[^\s,]+/g)
            this.setDataValue('scopes', matches)
          }
        }
        // Список грантов, которые может использовать приложение
        // grantTypes: {
        //   type: Sequlize.ARRAY(Sequelize.STRING),
        //   allowNull: false,
        //   // Я не знаю там копия объекта делается или нет, поэтому лучше так
        //   defaultValue: () => [],
        //   validate: {
        //     isArray: true,
        //     isAllowed(value) {
        //       const isValid = value.every(t => allowedGrantTypes.includes(t))
        //       if (!isValid) throw new Error('unknown grant type(s)')
        //     }
        //   }
        // }
      },
      {
        tableName: 'clients',
        schema: process.env.DATABASE_SCHEMA,
        indexes: [
          {
            unique: !0,
            name: 'unique_name',
            fields: [sequelize.fn('lower', sequelize.col('name'))]
          }
        ],
        hooks: {
          //
        },
        timestamps: !1,
        sequelize
      }
    )
  }

  validateRedirectUri(uri) {
    return this.redirectUris.includes(uri)
  }

  validateScope(scope) {
    const scopes = scope.match(/[^\s,]+/g)
    // Все значения scope должны быть в списке разрешенных
    return scopes.every(v => this.scopes.includes(v))
  }

  static findByIdAndSecret(id, secret) {
    return this.findOne({
      where: {
        id,
        secret
      }
    })
  }

  static associate({ User }) {
    this.belongsTo(User, {
      as: 'user',
      foreignKey: 'userId'
      // onDelete: 'CASCADE'
    })

    User.hasMany(this, {
      as: 'clients',
      foreignKey: 'userId'
    })
  }
}

export default Client
