const License = require('../models/License');
const path = require('path');

class LicenseController {
  static async getLicense(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const license = await License.findByEmail(email);
      
      if (!license) {
        return res.status(404).json({ error: 'License data not found' });
      }
      
      const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
      let frontImageUrl = license.front_image_url;
      let backImageUrl = license.back_image_url;
      
      if ((!frontImageUrl || !backImageUrl) && (license.front_image_path || license.back_image_path)) {
        frontImageUrl = license.front_image_path ? `${baseUrl}/${license.front_image_path.replace(/\\/g, '/')}` : null;
        backImageUrl = license.back_image_path ? `${baseUrl}/${license.back_image_path.replace(/\\/g, '/')}` : null;
      }
      
      const result = {
        id: license.id,
        email: license.email,
        front_image_url: frontImageUrl,
        back_image_url: backImageUrl,
        upload_date: license.upload_date
      };
      
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error retrieving license data' });
    }
  }

  static async uploadLicense(req, res) {
    try {
      const { email } = req.body;
      
      if (!email || !req.files.frontImage || !req.files.backImage) {
        return res.status(400).json({ error: 'Email and both images are required' });
      }

      const frontImagePath = req.files.frontImage[0].path;
      const backImagePath = req.files.backImage[0].path;
      
      const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
      const frontImageUrl = `${baseUrl}/${frontImagePath.replace(/\\/g, '/')}`;
      const backImageUrl = `${baseUrl}/${backImagePath.replace(/\\/g, '/')}`;

      const existingLicense = await License.findByEmail(email);
      
      if (existingLicense) {
        await License.update(email, frontImageUrl, backImageUrl);
        return res.status(200).json({ 
          message: 'License updated successfully',
          front_image_url: frontImageUrl,
          back_image_url: backImageUrl
        });
      } else {
        await License.create(email, frontImageUrl, backImageUrl);
        return res.status(201).json({ 
          message: 'License uploaded successfully',
          front_image_url: frontImageUrl,
          back_image_url: backImageUrl
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error uploading license' });
    }
  }
}

module.exports = LicenseController; 