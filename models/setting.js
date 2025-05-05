
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Setting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Setting.init({
    key: {
      type: DataTypes.STRING,
      primaryKey: true, // Explicitly define key as the primary key
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Setting',
    // Optional: If you don't want Sequelize to manage createdAt/updatedAt
    // timestamps: false
  });
  return Setting;
};

