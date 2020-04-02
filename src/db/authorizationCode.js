'use strict'

import Sequelize from 'sequelize'

class AuthorizationCode extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
          // validate: {
          //   len: [10, 255]
          // }
        },
        userId: {
          field: 'user_id',
          type: Sequelize.INTEGER
        },
        clientId: {
          field: 'client_id',
          type: Sequelize.INTEGER
        },
        // The OAuth 2.0 spec recommends a maximum lifetime of 10 minutes, but in practice, most services set the expiration much shorter, around 30-60 seconds.
        expiresAt: {
          field: 'expires_at',
          type: Sequelize.DATE,
          allowNull: false,
        },
        redirectUri: {
          field: 'redirect_uri',
          type: Sequelize.STRING(2047),
          allowNull: false,
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
      },
      {
        tableName: 'authorization_codes',
        schema: process.env.DATABASE_SCHEMA,
        timestamps: false,
        sequelize
      }
    )
  }

  get isExpired() {
    return new Date() >= this.expiresAt
  }

  static findByCode(code) {
    return this.findOne({
      where: {
        code
      }
    })
  }

  static associate({ Client, User }) {
    this.belongsTo(User, {
      as: 'user',
      foreignKey: 'userId',
      // onDelete: 'CASCADE'
    })
    this.belongsTo(Client, {
      as: 'client',
      foreignKey: 'clientId',
      // onDelete: 'CASCADE'
    })
  }
}

export default AuthorizationCode
