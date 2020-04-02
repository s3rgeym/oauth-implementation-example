'use strict'

import Sequelize from 'sequelize'

class Token extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        accessToken: {
          field: 'access_token',
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        accessExpiresAt: {
          field: 'access_expires_at',
          type: Sequelize.DATE
          // Должны ли быть вечные токены?
          // allowNull: false
        },
        refreshToken: {
          field: 'refresh_token',
          type: Sequelize.STRING,
          unique: true
        },
        refreshExpiresAt: {
          field: 'refresh_expires_at',
          type: Sequelize.DATE
        },
        // Насколько я понял токен всегда имеет клиента
        clientId: {
          field: 'client_id',
          allowNull: false,
          type: Sequelize.INTEGER
        },
        userId: {
          field: 'user_id',
          // allowNull: false,
          type: Sequelize.INTEGER
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
        tableName: 'tokens',
        schema: process.env.DATABASE_SCHEMA,
        timestamps: false,
        hooks: {
          //
        },
        sequelize
      }
    )
  }

  // Время истечения жизни токена доступа в секундах. 0 ‒ токен выдан на неопределенный период.
  // get expiresIn() {
  //   return this.accessExpiresAt === null
  //     ? 0
  //     : Math.floor((this.accessExpiresAt - new Date()) / 1000)
  // }

  get accessTokenIsExpired() {
    return this.accessExpiresAt !== null && new Date() >= this.accessExpiresAt
  }

  get refreshTokenIsExpired() {
    return this.refreshExpiresAt !== null && new Date() >= this.refreshExpiresAt
  }

  static findByAccessToken(accessToken) {
    return this.findOne({
      where: {
        accessToken
        // Так будет слишком неявно?
        // accessExpiresAt: {
        //   [Sequelize.Op.gt]: Sequelize.NOW
        // }
      }
    })
  }

  static findByRefreshToken(refreshToken) {
    return this.findOne({
      where: {
        refreshToken
      }
    })
  }

  static associate({ Client, User }) {
    // Player.belongsTo(Team)  // `teamId` will be added on Player / Source model
    // Coach.hasOne(Team)  // `coachId` will be added on Team / Target model
    this.belongsTo(Client, {
      as: 'client',
      foreignKey: 'clientId'
      // onDelete: 'CASCADE'
    })

    this.belongsTo(User, {
      as: 'user',
      foreignKey: 'userId'
      // onDelete: 'CASCADE'
    })

    User.hasMany(this, {
      as: 'tokens',
      foreignKey: 'userId'
    })
  }

  static loadScopes(models) {
    this.addScope('withUser', {
      include: [
        {
          as: 'user',
          model: models.User
        }
      ]
    })
  }
}

export default Token
