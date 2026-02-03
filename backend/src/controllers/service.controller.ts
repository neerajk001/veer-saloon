import serviceSchema from "../models/service";

export const createService  =async (req:any, res:any) =>{
    try {
        const {name , duration ,price} = req.body;

        if(!name || !duration || !price){
            return res.status(400).json({message : "All fields are required"});
        }
        
        const newService  = new serviceSchema({
            name,
            duration,
            price
        })
        await newService.save();
        return res.status(201).json({message : "Service created successfully", service : newService});
    }catch(error){
        return res.status(500).json({message : "Internal server error"});
    }
    
}

export const getAllServices = async (req:any ,res:any) =>{
    try {

        const services  = await serviceSchema.find();
        if(services.length === 0){
            return res.status(404).json({message : "No services found"});
        }
        return res.status(200).json({services});
    }catch(error){
        return res.status(500).json({message : "Internal server error"});
    }
}


export const getServiceById = async (req:any ,res:any) =>{
    try {
        const {id} = req.params;
        if(!id){
            return res.status(400).json({message : "Service id is required"});
        }
        const service  = await serviceSchema.findById(id);
        if(!service){
            return res.status(404).json({message : "Service not found"});
        }
        return res.status(200).json({service});
    }catch(error){
        return res.status(500).json({message : "Internal server error"});
    }
}

export const deleteServiceById = async (req:any ,res:any) =>{
    try {
        const {id} = req.params;    
        if(!id){
            return res.status(400).json({message : "Service id is required"});
        }
        const service  = await serviceSchema.findByIdAndDelete(id);
        if(!service){
            return res.status(404).json({message : "Service not found"});
        }
        return res.status(200).json({message : "Service deleted successfully"});
    }catch(error){
        return res.status(500).json({message : "Internal server error"});
    }
}

export const updateServiceById = async (req:any ,res:any) =>{
    try {
        const {id} = req.params;
        const {name , duration ,price} = req.body;
        if(!id){
            return res.status(400).json({message : "Service id is required"});
        }
        const service  = await serviceSchema.findById(id);
        if(!service){
            return res.status(404).json({message : "Service not found"});
        }
        service.name = name || service.name;
        service.duration = duration || service.duration;
        service.price = price || service.price;
        await service.save();
        return res.status(200).json({message : "Service updated successfully", service});
    }catch(error){
        console.log(error);
        return res.status(500).json({message : "Internal server error"});

    }
}