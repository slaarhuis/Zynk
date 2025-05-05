
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AccessToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Optional: Associate with User if needed
      // AccessToken.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  AccessToken.init({
    token: {
      type: DataTypes.STRING,
      primaryKey: true, // Explicitly set token as the primary key
      allowNull: false,
    },
    clientId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null for client credentials grant
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
    },
    scope: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'AccessToken',
    // timestamps: true, // Sequelize adds createdAt and updatedAt by default
    // If you want to disable the default 'id' column (though setting primaryKey usually suffices):
    // id: false, 
  });
  return AccessToken;
};

