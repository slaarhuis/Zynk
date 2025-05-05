
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Template extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Template.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    // filePath: DataTypes.STRING, // Removed
    spaceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documentType: {
      type: DataTypes.ENUM('document', 'presentation'),
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'Template',
  });
  return Template;
};
